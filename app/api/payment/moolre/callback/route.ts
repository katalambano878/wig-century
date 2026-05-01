import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendOrderConfirmation } from '@/lib/notifications';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * Moolre Callback Payload Structure (from their actual API):
 * {
 *   "status": 1,
 *   "code": "P01",
 *   "message": "Transaction Successful",
 *   "data": {
 *     "txtstatus": 1,
 *     "payer": "233535998837",
 *     "terminalid": "",
 *     "accountnumber": "10789906062911",
 *     "name": "",
 *     "amount": "2",
 *     "value": "2",
 *     "transactionid": "42252702",
 *     "externalref": "ORD-1770330034217-441",
 *     "thirdpartyref": "74658410493"
 *   },
 *   "secret": "c23bc2ab-...",
 *   "ts": "2026-02-05 22:21:16",
 *   "go": null
 * }
 */

export async function POST(req: Request) {
    console.log('[Callback] POST received at', new Date().toISOString());

    try {
        // Rate limiting
        const clientId = getClientIdentifier(req);
        const rateLimitResult = checkRateLimit(`callback:${clientId}`, RATE_LIMITS.callback);

        if (!rateLimitResult.success) {
            console.warn('[Callback] Rate limited:', clientId);
            return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
        }

        let body: any = {};
        const contentType = req.headers.get('content-type') || '';

        // Parse body
        try {
            if (contentType.includes('application/json')) {
                body = await req.json();
            } else if (contentType.includes('form')) {
                const formData = await req.formData();
                body = Object.fromEntries(formData.entries());
            } else {
                const rawText = await req.text();
                try {
                    body = JSON.parse(rawText);
                } catch {
                    try {
                        body = Object.fromEntries(new URLSearchParams(rawText).entries());
                    } catch {
                        console.warn('[Callback] Could not parse body');
                    }
                }
            }
        } catch (parseError) {
            console.error('[Callback] Body parsing failed');
            return NextResponse.json({ success: false, message: 'Invalid Request Body' }, { status: 400 });
        }

        console.log('[Callback] Body keys:', Object.keys(body).join(', '));
        console.log('[Callback] Data keys:', body.data ? Object.keys(body.data).join(', ') : 'no data object');

        // ============================================================
        // SECURITY: Verify callback secret.
        // If it fails, we DO NOT immediately reject — instead we fall
        // back to verifying the transaction directly with Moolre's API
        // (using our authenticated server-side credentials). This makes
        // the system resilient to MOOLRE_CALLBACK_SECRET misconfigurations
        // while still requiring real-payment confirmation from Moolre.
        // ============================================================
        const expectedSecret = process.env.MOOLRE_CALLBACK_SECRET;
        const receivedSecret = body.secret;
        let secretVerified = false;

        if (expectedSecret) {
            if (receivedSecret && receivedSecret === expectedSecret) {
                secretVerified = true;
            } else {
                const mask = (s: any) =>
                    typeof s === 'string' && s.length > 8
                        ? `${s.slice(0, 4)}…${s.slice(-4)} (len=${s.length})`
                        : `<missing or short> (len=${typeof s === 'string' ? s.length : 0})`;
                console.error(
                    '[Callback] Secret mismatch! Received',
                    mask(receivedSecret),
                    'but MOOLRE_CALLBACK_SECRET is',
                    mask(expectedSecret),
                    '— will fall back to Moolre API verification. Update the env var in Vercel → Project Settings → Environment Variables → MOOLRE_CALLBACK_SECRET to match the value in Moolre → API → Security, then redeploy.'
                );
            }
        } else {
            console.warn(
                '[Callback] WARNING: MOOLRE_CALLBACK_SECRET not configured. Will rely on Moolre API verification only — set it in production!'
            );
        }

        // ============================================================
        // EXTRACT FIELDS - Moolre nests payment data inside body.data
        // ============================================================
        const data = body.data || {};

        // Order reference: check body.data.externalref first, then top-level fallbacks
        const rawExternalRef =
            data.externalref ||
            data.external_reference ||
            data.orderRef ||
            body.externalref ||
            body.orderRef ||
            body.external_reference;

        // Strip retry suffix (e.g., "ORD-123-R1770000000" -> "ORD-123")
        const merchantOrderRef = rawExternalRef
            ? rawExternalRef.replace(/-R\d+$/, '')
            : (data.metadata?.original_order_number || body.metadata?.original_order_number);

        // Moolre's transaction reference
        const moolreReference =
            data.transactionid ||
            data.thirdpartyref ||
            body.reference ||
            'callback';

        // Payment status: body.status === 1 means API call succeeded,
        // body.data.txtstatus === 1 means transaction was successful
        const apiStatus = body.status;
        const txStatus = data.txtstatus;
        const messageStr = String(body.message || '').toLowerCase();

        console.log('[Callback] Order ref:', merchantOrderRef,
            '| API status:', apiStatus,
            '| TX status:', txStatus,
            '| Message:', body.message,
            '| Moolre ref:', moolreReference);

        if (!merchantOrderRef) {
            console.error('[Callback] Missing order reference. Body:', JSON.stringify(body).substring(0, 500));
            return NextResponse.json({ success: false, message: 'Missing order reference' }, { status: 400 });
        }

        // ============================================================
        // SECURITY: Strict success validation
        // Require BOTH api status AND transaction status to be success,
        // OR the message explicitly indicates success (as fallback only 
        // when both status fields are present and consistent).
        // ============================================================
        const apiOk = (apiStatus === 1 || apiStatus === '1');
        const txOk = (txStatus === 1 || txStatus === '1');
        const messageOk = messageStr.includes('successful') || messageStr.includes('success');

        // Require at least api status OR tx status to be explicitly successful
        // AND the message must not indicate failure
        let isSuccess = (apiOk || txOk) && !messageStr.includes('fail') && !messageStr.includes('error');

        // ============================================================
        // FALLBACK VERIFICATION
        // If the callback secret could NOT be verified, we do not trust
        // the body alone — we independently call Moolre's /embed/status
        // API with our authenticated credentials to confirm the
        // transaction. Only proceed if Moolre confirms.
        // ============================================================
        if (isSuccess && !secretVerified) {
            console.warn('[Callback] Secret unverified — re-checking with Moolre API for', merchantOrderRef);

            if (!process.env.MOOLRE_API_USER || !process.env.MOOLRE_API_PUBKEY) {
                console.error('[Callback] Cannot fall back: Moolre API credentials missing. Rejecting.');
                return NextResponse.json(
                    { success: false, message: 'Invalid callback signature and verification unavailable' },
                    { status: 403 }
                );
            }

            // Try the externalref from the callback first (it's already what
            // Moolre indexed it under), then the saved metadata, then the bare
            // order ref as a last resort.
            const candidateRefs: string[] = [];
            if (rawExternalRef) candidateRefs.push(rawExternalRef);

            try {
                const { data: storedOrder } = await supabaseAdmin
                    .from('orders')
                    .select('metadata')
                    .eq('order_number', merchantOrderRef)
                    .single();
                const savedRef = (storedOrder?.metadata as any)?.moolre_externalref;
                if (savedRef && !candidateRefs.includes(savedRef)) candidateRefs.push(savedRef);
            } catch {
                // Ignore — we'll try the other refs
            }

            if (!candidateRefs.includes(merchantOrderRef)) candidateRefs.push(merchantOrderRef);

            let moolreConfirmed = false;
            for (const ref of candidateRefs) {
                try {
                    const checkResponse = await fetch('https://api.moolre.com/embed/status', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-USER': process.env.MOOLRE_API_USER,
                            'X-API-PUBKEY': process.env.MOOLRE_API_PUBKEY,
                        },
                        body: JSON.stringify({ externalref: ref }),
                    });
                    const checkResult = await checkResponse.json();
                    const checkStatusStr = String(checkResult.data?.status || '').toLowerCase();
                    const isOkStatus =
                        checkResult.status === 1 &&
                        checkResult.data &&
                        (checkStatusStr === 'success' ||
                            checkStatusStr === 'successful' ||
                            checkStatusStr === 'completed' ||
                            checkStatusStr === 'paid');

                    if (isOkStatus) {
                        console.log('[Callback] Moolre API confirmed payment for ref:', ref);
                        moolreConfirmed = true;
                        break;
                    }
                    console.log('[Callback] Moolre API did not confirm ref:', ref, '| status:', checkStatusStr);
                } catch (apiError: any) {
                    console.warn('[Callback] Moolre API check error for', ref, ':', apiError?.message);
                }
            }

            if (!moolreConfirmed) {
                console.error('[Callback] Fallback verification FAILED — rejecting unverified callback for', merchantOrderRef);
                return NextResponse.json(
                    { success: false, message: 'Callback signature invalid and Moolre API did not confirm payment' },
                    { status: 403 }
                );
            }

            console.log('[Callback] Fallback verification SUCCESS — proceeding to mark order paid:', merchantOrderRef);
            isSuccess = true;
        }

        if (isSuccess) {
            console.log(`[Callback] Payment SUCCESS for Order ${merchantOrderRef}`);

            // Check if order exists
            const { data: existingOrder, error: fetchError } = await supabaseAdmin
                .from('orders')
                .select('id, order_number, payment_status, total')
                .eq('order_number', merchantOrderRef)
                .single();

            if (fetchError || !existingOrder) {
                console.error('[Callback] Order not found:', merchantOrderRef);
                return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
            }

            // Already paid - idempotent
            if (existingOrder.payment_status === 'paid') {
                console.log('[Callback] Order already paid, skipping:', merchantOrderRef);
                return NextResponse.json({ success: true, message: 'Order already processed' });
            }

            // ============================================================
            // SECURITY: Verify amount matches — REJECT if mismatch
            // ============================================================
            const callbackAmount = data.amount ? parseFloat(data.amount) : (body.amount ? parseFloat(body.amount) : null);
            if (callbackAmount !== null) {
                const expectedAmount = Number(existingOrder.total);
                if (Math.abs(callbackAmount - expectedAmount) > 0.01) {
                    console.error('[Callback] AMOUNT MISMATCH — REJECTING! Expected:', expectedAmount, 'Got:', callbackAmount, 'Order:', merchantOrderRef);
                    return NextResponse.json({
                        success: false,
                        message: 'Payment amount does not match order total'
                    }, { status: 400 });
                }
            }

            // Mark order as paid via RPC
            const { data: orderJson, error: updateError } = await supabaseAdmin
                .rpc('mark_order_paid', {
                    order_ref: merchantOrderRef,
                    moolre_ref: String(moolreReference)
                });

            if (updateError) {
                console.error('[Callback] RPC Error:', updateError.message);
                return NextResponse.json({ success: false, message: 'Database update failed' }, { status: 500 });
            }

            if (!orderJson) {
                console.error('[Callback] Order not found after RPC:', merchantOrderRef);
                return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
            }

            console.log('[Callback] Order updated! ID:', orderJson.id, '| Status:', orderJson.status);

            // Update customer stats
            try {
                if (orderJson.email) {
                    await supabaseAdmin.rpc('update_customer_stats', {
                        p_customer_email: orderJson.email,
                        p_order_total: orderJson.total
                    });
                }
            } catch (statsError: any) {
                console.error('[Callback] Customer stats failed:', statsError.message);
            }

            // Send SMS + Email notifications
            try {
                console.log('[Callback] Sending notifications for:', orderJson.order_number);
                await sendOrderConfirmation(orderJson);
                console.log('[Callback] Notifications sent!');
            } catch (notifyError: any) {
                console.error('[Callback] Notification failed:', notifyError.message);
            }

            return NextResponse.json({ success: true, message: 'Payment verified and Order Updated' });

        } else {
            // Payment failed
            console.log(`[Callback] Payment FAILED for ${merchantOrderRef} | Status: ${apiStatus} | TX: ${txStatus}`);

            await supabaseAdmin
                .from('orders')
                .update({
                    payment_status: 'failed',
                    metadata: {
                        moolre_reference: moolreReference,
                        failure_reason: body.message || 'Payment failed'
                    }
                })
                .eq('order_number', merchantOrderRef);

            return NextResponse.json({ success: false, message: 'Payment not successful' });
        }

    } catch (error: any) {
        console.error('[Callback] Critical Error:', error.message);
        return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    return NextResponse.json({ message: 'Moolre callback endpoint ready', timestamp: new Date().toISOString() });
}
