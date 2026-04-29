'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import { Check, X, Clock, Store, User, MapPin, Phone } from 'lucide-react';

interface PendingBusiness {
  id: string;
  name: string;
  category?: string;
  description?: string;
  address?: string;
  phone?: string;
  ownerId: string;
  ownerEmail?: string;
  createdAt?: any;
  status?: 'pending' | 'approved' | 'rejected';
}

export default function ApprovalsPage() {
  const [pendingBusinesses, setPendingBusinesses] = useState<PendingBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    // Real-time listener for pending businesses
    const q = query(
      collection(db, 'businesses'),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const businesses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PendingBusiness[];

      // Fetch owner emails
      const businessesWithOwners = await Promise.all(
        businesses.map(async (business) => {
          try {
            const userDoc = await getDocs(query(
              collection(db, 'users'),
              where('__name__', '==', business.ownerId || business.id)
            ));
            const userData = userDoc.docs[0]?.data();
            return {
              ...business,
              ownerEmail: userData?.email || 'Unknown'
            };
          } catch {
            return business;
          }
        })
      );

      setPendingBusinesses(businessesWithOwners);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (businessId: string) => {
    setProcessing(businessId);
    try {
      await updateDoc(doc(db, 'businesses', businessId), {
        status: 'approved',
        approvedAt: new Date(),
      });
      // Note: The real-time listener will automatically remove this from the list
    } catch (error) {
      console.error('Error approving business:', error);
      alert('Failed to approve business');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (businessId: string) => {
    const reason = window.prompt('Please enter a reason for rejecting this business:');
    if (reason === null) return;
    if (reason.trim() === '') {
      alert('A rejection reason is required.');
      return;
    }
    
    setProcessing(businessId);
    try {
      await updateDoc(doc(db, 'businesses', businessId), {
        status: 'rejected',
        rejectionReason: reason.trim(),
        rejectedAt: new Date(),
      });
    } catch (error) {
      console.error('Error rejecting business:', error);
      alert('Failed to reject business');
    } finally {
      setProcessing(null);
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
          <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
          <p className="text-gray-500">Review and approve new vendor registrations</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg">
          <Clock size={20} />
          <span className="font-medium">{pendingBusinesses.length} pending</span>
        </div>
      </div>

      {pendingBusinesses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-500">No pending approvals at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingBusinesses.map((business) => (
            <div key={business.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <Store size={28} className="text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{business.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full">
                          {business.category || 'Uncategorized'}
                        </span>
                        <span className="px-2 py-1 bg-yellow-50 text-yellow-600 text-xs font-medium rounded-full flex items-center gap-1">
                          <Clock size={12} />
                          Pending Approval
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(business.id)}
                      disabled={processing === business.id}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <Check size={18} />
                      {processing === business.id ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(business.id)}
                      disabled={processing === business.id}
                      className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <X size={18} />
                      Reject
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {business.description && (
                    <div className="md:col-span-3">
                      <p className="text-gray-600">{business.description}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-gray-600">
                    <User size={16} className="text-gray-400" />
                    <span>{business.ownerEmail}</span>
                  </div>
                  
                  {business.address && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin size={16} className="text-gray-400" />
                      <span>{business.address}</span>
                    </div>
                  )}
                  
                  {business.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone size={16} className="text-gray-400" />
                      <span>{business.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
                  Submitted on {business.createdAt?.toDate?.().toLocaleString() || 'Unknown date'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
