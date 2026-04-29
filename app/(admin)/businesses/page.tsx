'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Search, Edit2, Trash2, MapPin, Phone, Star, X, Check, Store, Plus, Download, Eye } from 'lucide-react';
import Link from 'next/link';
import { downloadCSV, formatBusinessesForExport } from '@/lib/export';

interface Business {
  id: string;
  name: string;
  category?: string;
  description?: string;
  address?: string;
  phone?: string;
  totalStamps?: number;
  imageUrl?: string;
  isActive?: boolean;
  status?: string;
  suspensionReason?: string;
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [editForm, setEditForm] = useState<Partial<Business>>({});
  
  // Create business modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    category: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    password: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    const filtered = businesses.filter(b => 
      b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.address?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredBusinesses(filtered);
  }, [searchQuery, businesses]);

  const fetchBusinesses = async () => {
    try {
      const snap = await getDocs(collection(db, 'businesses'));
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Business[];
      setBusinesses(data);
      setFilteredBusinesses(data);
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (business: Business) => {
    setEditingBusiness(business);
    setEditForm({ ...business });
  };

  const handleSave = async () => {
    if (!editingBusiness) return;

    try {
      const ref = doc(db, 'businesses', editingBusiness.id);
      await updateDoc(ref, {
        name: editForm.name,
        category: editForm.category,
        description: editForm.description,
        address: editForm.address,
        phone: editForm.phone,
      });

      setBusinesses(prev => prev.map(b => 
        b.id === editingBusiness.id ? { ...b, ...editForm } : b
      ));
      setEditingBusiness(null);
    } catch (error) {
      console.error('Error updating business:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this business?')) return;

    try {
      await deleteDoc(doc(db, 'businesses', id));
      setBusinesses(prev => prev.filter(b => b.id !== id));
    } catch (error) {
      console.error('Error deleting business:', error);
    }
  };

  const handleToggleSuspend = async (business: Business) => {
    try {
      const isSuspending = business.status !== 'suspended';
      let updates: any = {};
      
      if (isSuspending) {
        const reason = window.prompt('Please enter a reason for suspending this business:');
        if (reason === null) return;
        if (reason.trim() === '') {
          alert('A suspension reason is required.');
          return;
        }
        updates = {
          status: 'suspended',
          suspensionReason: reason.trim(),
          suspendedAt: new Date(),
        };
      } else {
        if (!confirm('Are you sure you want to reactivate this business?')) return;
        updates = {
          status: 'approved',
          suspensionReason: null,
          reactivatedAt: new Date(),
        };
      }
      
      await updateDoc(doc(db, 'businesses', business.id), updates);
      setBusinesses(prev => prev.map(b => b.id === business.id ? { ...b, ...updates } : b));
    } catch (error) {
      console.error('Error toggling suspend status:', error);
      alert('Failed to update business status');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Import Firebase Auth dynamically to create user
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');
      const { setDoc } = await import('firebase/firestore');

      // Create user account for the vendor
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        createForm.email, 
        createForm.password
      );
      const user = userCredential.user;

      // Create user document with vendor role
      await setDoc(doc(db, 'users', user.uid), {
        email: createForm.email,
        role: 'vendor',
        createdAt: new Date(),
      });

      // Create business document
      await setDoc(doc(db, 'businesses', user.uid), {
        name: createForm.name,
        category: createForm.category,
        description: createForm.description,
        address: createForm.address,
        phone: createForm.phone,
        totalStamps: 0,
        createdAt: new Date(),
        ownerId: user.uid,
      });

      // Refresh businesses list
      await fetchBusinesses();
      
      // Close modal and reset form
      setIsCreateModalOpen(false);
      setCreateForm({
        name: '',
        category: '',
        description: '',
        address: '',
        phone: '',
        email: '',
        password: '',
      });

      alert('Business created successfully!');
    } catch (error: any) {
      console.error('Error creating business:', error);
      alert('Error: ' + (error.message || 'Failed to create business'));
    } finally {
      setCreating(false);
    }
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Businesses</h1>
          <p className="text-gray-500">Manage all business listings on the platform</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => downloadCSV(formatBusinessesForExport(filteredBusinesses), 'businesses')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={20} />
            Export CSV
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={20} />
            Create Business
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search businesses by name, category, or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>

      {/* Businesses Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredBusinesses.map((business) => (
          <div key={business.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Image */}
            <div className="h-40 bg-gray-100 relative">
              {business.imageUrl ? (
                <img 
                  src={business.imageUrl} 
                  alt={business.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Store size={40} className="text-gray-300" />
                </div>
              )}
              <div className="absolute top-3 right-3 flex gap-2">
                <Link
                  href={`/businesses/${business.id}`}
                  className="p-2 bg-white rounded-lg shadow-sm hover:bg-blue-50 transition-colors"
                  title="View Details"
                >
                  <Eye size={16} className="text-blue-500" />
                </Link>
                <button
                  onClick={() => handleToggleSuspend(business)}
                  className="p-2 bg-white rounded-lg shadow-sm hover:bg-orange-50 transition-colors"
                  title={business.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                >
                  {business.status === 'suspended' ? <Check size={16} className="text-green-500" /> : <X size={16} className="text-orange-500" />}
                </button>
                <button
                  onClick={() => handleEdit(business)}
                  className="p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                  title="Edit"
                >
                  <Edit2 size={16} className="text-gray-600" />
                </button>
                <button
                  onClick={() => handleDelete(business.id)}
                  className="p-2 bg-white rounded-lg shadow-sm hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} className="text-red-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{business.name}</h3>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    business.status === 'suspended' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    {business.status === 'suspended' ? 'Suspended' : (business.category || 'Uncategorized')}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                {business.description || 'No description available'}
              </p>

              <div className="space-y-2 text-sm">
                {business.address && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin size={14} />
                    <span className="truncate">{business.address}</span>
                  </div>
                )}
                {business.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone size={14} />
                    <span>{business.phone}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-500 fill-yellow-500" />
                  <span className="text-sm font-medium text-gray-900">
                    {business.totalStamps?.toLocaleString() || 0} stamps
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredBusinesses.length === 0 && (
        <div className="text-center py-12">
          <Store size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No businesses found</p>
        </div>
      )}

      {/* Edit Modal */}
      {editingBusiness && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Edit Business</h2>
              <button 
                onClick={() => setEditingBusiness(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={editForm.category || ''}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Select category</option>
                  <option value="Coffee shops">Coffee shops</option>
                  <option value="Food & Beverage">Food & Beverage</option>
                  <option value="Spa/Wellness">Spa/Wellness</option>
                  <option value="Beauty Salon">Beauty Salon</option>
                  <option value="Barber shop">Barber shop</option>
                  <option value="Car wash">Car wash</option>
                  <option value="Petrol station">Petrol station</option>
                  <option value="Retail">Retail</option>
                  <option value="Fitness center">Fitness center</option>
                  <option value="Health center">Health center</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  type="text"
                  value={editForm.address || ''}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setEditingBusiness(null)}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Business Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Create New Business</h2>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {/* Business Info Section */}
              <div className="pb-4 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Business Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Name *</label>
                    <input
                      type="text"
                      required
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g., Joe's Coffee Shop"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                    <select
                      required
                      value={createForm.category}
                      onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">Select category</option>
                      <option value="Coffee shops">Coffee shops</option>
                      <option value="Food & Beverage">Food & Beverage</option>
                      <option value="Spa/Wellness">Spa/Wellness</option>
                      <option value="Beauty Salon">Beauty Salon</option>
                      <option value="Barber shop">Barber shop</option>
                      <option value="Car wash">Car wash</option>
                      <option value="Petrol station">Petrol station</option>
                      <option value="Retail">Retail</option>
                      <option value="Fitness center">Fitness center</option>
                      <option value="Health center">Health center</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                      placeholder="Brief description of the business..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      value={createForm.address}
                      onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Full address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>
              </div>

              {/* Account Section */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Vendor Account</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      required
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="vendor@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="At least 6 characters"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Business'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
