'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Address {
  id: string;
  full_name: string;
  phone: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

const emptyForm = {
  full_name: '',
  phone: '',
  address_line1: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'Ghana',
  is_default: false,
};

export default function AddressBook() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }
    const { data, error: loadError } = await supabase
      .from('addresses')
      .select('id, full_name, phone, address_line1, city, state, postal_code, country, is_default')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (loadError) setError(loadError.message);
    else setAddresses((data || []) as Address[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setError('');
  }

  function openEdit(address: Address) {
    setEditingId(address.id);
    setForm({
      full_name: address.full_name,
      phone: address.phone,
      address_line1: address.address_line1,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      is_default: address.is_default,
    });
    setShowForm(true);
    setError('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Please sign in again.');
      return;
    }
    if (!form.full_name || !form.phone || !form.address_line1 || !form.city || !form.state || !form.postal_code) {
      setError('Name, phone, street, city, region, and postal code are required.');
      return;
    }
    if (form.is_default) {
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', session.user.id);
    }
    const row = { ...form, user_id: session.user.id, type: 'shipping' };
    const result = editingId
      ? await supabase.from('addresses').update(row).eq('id', editingId).eq('user_id', session.user.id)
      : await supabase.from('addresses').insert(row);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setShowForm(false);
    setEditingId(null);
    await load();
  }

  async function remove(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('addresses').delete().eq('id', id).eq('user_id', session.user.id);
    await load();
  }

  async function makeDefault(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', session.user.id);
    await supabase.from('addresses').update({ is_default: true }).eq('id', id).eq('user_id', session.user.id);
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Address Book</h2>
        <button
          onClick={openNew}
          className="px-4 py-2 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors whitespace-nowrap"
        >
          <i className="ri-add-line mr-2"></i>
          Add New Address
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {showForm && (
        <form onSubmit={save} className="bg-white border-2 border-blue-700 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">{editingId ? 'Edit Address' : 'New Address'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([
              ['full_name', 'Full Name', 'Ama Mensah'],
              ['phone', 'Phone Number', '+233 24 123 4567'],
              ['city', 'City', 'Accra'],
              ['state', 'State / Region', 'Greater Accra'],
              ['postal_code', 'Postal code', '00233'],
              ['country', 'Country', 'Ghana'],
            ] as const).map(([key, label, placeholder]) => (
              <div key={key} className={key === 'full_name' || key === 'phone' ? '' : ''}>
                <label className="block text-sm font-semibold text-gray-900 mb-2">{label}</label>
                <input
                  type="text"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                  placeholder={placeholder}
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Street Address</label>
              <input
                type="text"
                value={form.address_line1}
                onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-700 focus:border-transparent"
                placeholder="123 Oxford Street"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                  className="w-4 h-4 text-blue-700 border-gray-300 rounded focus:ring-blue-700"
                />
                <span className="ml-2 text-sm text-gray-700">Set as default address</span>
              </label>
            </div>
            <div className="md:col-span-2 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <button type="submit" className="flex-1 py-3 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors">
                Save Address
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="flex-1 py-3 border-2 border-gray-300 text-gray-900 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500">Loading addresses…</p>
      ) : addresses.length === 0 ? (
        <p className="text-gray-500">No saved addresses yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`bg-white border-2 rounded-lg p-6 relative ${address.is_default ? 'border-blue-700' : 'border-gray-200'}`}
            >
              {address.is_default && (
                <span className="absolute top-4 right-4 px-3 py-1 bg-blue-700 text-white text-xs font-semibold rounded-full">
                  Default
                </span>
              )}
              <h3 className="text-lg font-bold text-gray-900">{address.full_name}</h3>
              <p className="text-gray-600">{address.phone}</p>
              <div className="text-gray-700 space-y-1 my-4">
                <p>{address.address_line1}</p>
                <p>{address.city}, {address.state} {address.postal_code}</p>
                <p>{address.country}</p>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <button onClick={() => openEdit(address)} className="flex-1 py-2 border border-gray-300 text-gray-900 rounded-lg font-semibold hover:bg-gray-50">
                  Edit
                </button>
                {!address.is_default && (
                  <button onClick={() => makeDefault(address.id)} className="flex-1 py-2 border border-blue-700 text-blue-700 rounded-lg font-semibold hover:bg-blue-50">
                    Set Default
                  </button>
                )}
                <button onClick={() => remove(address.id)} className="px-4 py-2 border border-red-600 text-red-600 rounded-lg font-semibold hover:bg-red-50">
                  <i className="ri-delete-bin-line"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
