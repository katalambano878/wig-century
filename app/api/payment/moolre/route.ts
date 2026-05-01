import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(req: Request) {
    try {
        // Rate limiting
        const clientId = getClientIdentifier(req);
        const rateLimitResult = checkRateLimit(`payment:${clientId}`, RATE_LIMITS.payment);

        if (!rateLimitResult.success) {
            return NextResponse.json(
                { success: false, message: 'Too many requests. Please try again later.' },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': rateLimitResult.resetIn.toString()
                    }
                }
            );
        }

        const body = await req.json();
        const { orderId, customerEmail, redirectUrl } = body;

        if (!orderId || typeof orderId !== 'string') {
            return NextResponse.json({ success: false, message: 'Missing or invalid orderId' }, { status: 400 });
        }

        // Ensure environment variables are set
        if (!process.env.MOOLRE_API_USER || !process.env.MOOLRE_API_PUBKEY || !process.env.MOOLRE_ACCOUNT_NUMBER) {
            console.error('Missing Moolre credentials');
            return NextResponse.json({ success: false, message: 'Payment gateway configuration error' }, { status: 500 });
        }

        // SECURITY: Fetch the order from the database and use its total.
        // NEVER trust the amount from the client.
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
        const query = supabaseAdmin
            .from('orders')
            .select('id, order_number, total, email, payment_status');

        const { data: order, error: orderError } = isUUID
            ? await query.eq('id', orderId).single()
            : await query.eq('order_number', orderId).single();

        if (orderError || !order) {
            console.error('[Payment] Order not found:', orderId);
            return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        }

        if (order.payment_status === 'paid') {
            return NextResponse.json({ success: false, message: 'Order is already paid' }, { status: 400 });
        }

        // Stock validation: block payment only if items are confirmed out of stock.
        // Query failures are logged but don't block payment (avoids breaking
        // the normal checkout flow where order_items may not be committed yet).
        try {
            const { data: orderItems, error: itemsError } = await supabaseAdmin
                .from('order_items')
                .select('quantity, product_id, products(name, quantity, is_active)')
                .eq('order_id', order.id);

            if (itemsError) {
                console.warn('[Payment] Stock check query failed (non-blocking):', itemsError.message);
            } else if (orderItems && orderItems.length > 0) {
                const outOfStock: string[] = [];
                for (const item of orderItems) {
                    const product = (item as any).products;
                    if (!product) continue;
                    if (!product.is_active) {
                        outOfStock.push(`${product.name} is no longer available`);
                    } else if (product.quantity < item.quantity) {
                        outOfStock.push(
                            product.quantity === 0
                                ? `${product.name} is out of stock`
                                : `${product.name} — only ${product.quantity} left (you ordered ${item.quantity})`
                        );
                    }
                }
                if (outOfStock.length > 0) {
                    console.log('[Payment] Blocked — out of stock items:', outOfStock);
                    return NextResponse.json({
                        success: false,
                        message: `Some items are out of stock: ${outOfStock.join('; ')}`,
                        outOfStock,
                    }, { status: 409 });
                }
            }
        } catch (stockErr: any) {
            console.warn('[Payment] Stock check exception (non-blocking):', stockErr.message);
        }

        const amount = Number(order.total);
        if (!amount || amount <= 0) {
            return NextResponse.json({ success: false, message: 'Invalid order amount' }, { status: 400 });
        }

        const orderRef = order.order_number || orderId;

        const requestUrl = new URL(req.url);
        const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin).replace(/\/+$/, '');

        // Optional override for mobile deep-link return.
        const defaultRedirectUrl = `${baseUrl}/order-success?order=${orderRef}&payment_success=true`;
        const allowedPrefixes = ['https://', 'wigcentury://', 'exp://', 'exps://'];
        const safeRedirectUrl =
            typeof redirectUrl === 'string' &&
                allowedPrefixes.some((prefix) => redirectUrl.startsWith(prefix))
                ? redirectUrl
                : defaultRedirectUrl;

        // Generate a unique external reference for Moolre
        const uniqueRef = `${orderRef}-R${Date.now()}`;

        // Moolre Payload
        const payload = {
            type: 1,
            amount: amount.toString(),
            email: process.env.MOOLRE_MERCHANT_EMAIL || 'admin@wigcentury.com',
            externalref: uniqueRef,
            callback: `${baseUrl}/api/payment/moolre/callback`,
            redirect: safeRedirectUrl,
            reusable: "0",
            currency: "GHS",
            accountnumber: process.env.MOOLRE_ACCOUNT_NUMBER,
            metadata: {
                customer_email: customerEmail || order.email,
                original_order_number: orderRef
            }
        };

        console.log('[Payment] Initiating for order:', orderRef, '| Amount from DB:', amount, '| Callback:', payload.callback);

        const response = await fetch('https://api.moolre.com/embed/link', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-USER': process.env.MOOLRE_API_USER,
                'X-API-PUBKEY': process.env.MOOLRE_API_PUBKEY
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log('[Payment] Response status:', result.status, '| Has URL:', !!result.data?.authorization_url);

        if (result.status === 1 && result.data?.authorization_url) {
            return NextResponse.json({
                success: true,
                url: result.data.authorization_url,
                reference: result.data.reference,
                externalRef: uniqueRef
            });
        } else {
            return NextResponse.json({ success: false, message: result.message || 'Failed to generate payment link' }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Payment API Error:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
