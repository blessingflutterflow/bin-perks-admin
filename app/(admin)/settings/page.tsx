'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, 'platform', 'settings');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setWhatsappNumber(data.whatsappNumber || '');
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const docRef = doc(db, 'platform', 'settings');
      await setDoc(docRef, { whatsappNumber, plans }, { merge: true });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const addPlan = () => {
    setPlans([...plans, { id: '', name: '', price: 0, interval: 30, features: '' }]);
  };

  const updatePlan = (index: number, field: string, value: any) => {
    const newPlans = [...plans];
    newPlans[index][field] = value;
    setPlans(newPlans);
  };

  const removePlan = (index: number) => {
    const newPlans = [...plans];
    newPlans.splice(index, 1);
    setPlans(newPlans);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-gray-500">Configure global application settings and subscription plans</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
          <form onSubmit={handleSave} className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Support Contact</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp Support Number
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-4 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                    WA
                  </span>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="e.g. +27821234567"
                    className="flex-1 block w-full rounded-none rounded-r-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Include the country code (e.g., +27). This number will be shown to suspended vendors.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save All Settings'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden h-fit">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Subscription Plans</h2>
              <button
                onClick={addPlan}
                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-sm font-medium rounded-lg hover:bg-indigo-100 transition-colors"
              >
                + Add Plan
              </button>
            </div>

            <div className="space-y-6">
              {plans.map((plan, idx) => (
                <div key={idx} className="p-4 border border-gray-200 rounded-lg bg-gray-50 relative">
                  <button
                    onClick={() => removePlan(idx)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove Plan"
                  >
                    ×
                  </button>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Plan ID</label>
                      <input
                        type="text"
                        value={plan.id}
                        onChange={(e) => updatePlan(idx, 'id', e.target.value)}
                        placeholder="e.g. basic"
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Display Name</label>
                      <input
                        type="text"
                        value={plan.name}
                        onChange={(e) => updatePlan(idx, 'name', e.target.value)}
                        placeholder="e.g. Basic Plan"
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Price (ZAR)</label>
                      <input
                        type="number"
                        value={plan.price}
                        onChange={(e) => updatePlan(idx, 'price', Number(e.target.value))}
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Interval (Days)</label>
                      <input
                        type="number"
                        value={plan.interval}
                        onChange={(e) => updatePlan(idx, 'interval', Number(e.target.value))}
                        className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Features (comma separated)</label>
                    <input
                      type="text"
                      value={plan.features}
                      onChange={(e) => updatePlan(idx, 'features', e.target.value)}
                      placeholder="e.g. 500 Stamps/mo, Basic Support"
                      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              ))}
              {plans.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No plans defined.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
