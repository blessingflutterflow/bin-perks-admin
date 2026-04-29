'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Store, MapPin, Phone, Star, ShieldAlert, CheckCircle, Clock, Users, Gift, Ticket, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface Business {
  id: string;
  name: string;
  category?: string;
  description?: string;
  address?: string;
  phone?: string;
  totalStamps?: number;
  imageUrl?: string;
  status?: string;
  suspensionReason?: string;
  createdAt?: any;
  stampGoal?: number;
  subscriptionStatus?: string;
  currentPeriodEnd?: any;
  planId?: string;
  isPaused?: boolean;
  businessHours?: any;
}

export default function BusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.id as string;

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    customers: 0,
    redemptions: 0,
    reviews: 0,
    averageRating: 0,
  });

  useEffect(() => {
    fetchData();
  }, [businessId]);

  const fetchData = async () => {
    try {
      // 1. Fetch Business Details
      const bizDoc = await getDoc(doc(db, 'businesses', businessId));
      if (bizDoc.exists()) {
        setBusiness({ id: bizDoc.id, ...bizDoc.data() } as Business);
      } else {
        router.push('/businesses');
        return;
      }

      // 2. Fetch Metrics & Payments
      const [loyaltiesSnap, redemptionsSnap, reviewsSnap, paymentsSnap] = await Promise.all([
        getDocs(query(collection(db, 'loyalties'), where('businessId', '==', businessId))),
        getDocs(query(collection(db, 'redemptions'), where('businessId', '==', businessId))),
        getDocs(query(collection(db, 'reviews'), where('businessId', '==', businessId))),
        getDocs(query(collection(db, 'payments'), where('businessId', '==', businessId))),
      ]);

      let totalRating = 0;
      reviewsSnap.docs.forEach(doc => {
        totalRating += doc.data().rating || 0;
      });

      setMetrics({
        customers: loyaltiesSnap.size,
        redemptions: redemptionsSnap.size,
        reviews: reviewsSnap.size,
        averageRating: reviewsSnap.size > 0 ? totalRating / reviewsSnap.size : 0,
      });

      const paymentsList: any[] = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      paymentsList.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setPayments(paymentsList);

    } catch (error) {
      console.error('Error fetching business details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSuspend = async () => {
    if (!business) return;
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
      setBusiness({ ...business, ...updates });
    } catch (error) {
      console.error('Error toggling suspend status:', error);
      alert('Failed to update business status');
    }
  };

  const handleAdd30Days = async () => {
    if (!business) return;
    if (!confirm('Are you sure you want to manually add 30 days of access?')) return;
    
    try {
      const now = new Date();
      let newEnd = new Date();
      
      const currentEnd = business.currentPeriodEnd 
        ? (business.currentPeriodEnd.toDate ? business.currentPeriodEnd.toDate() : new Date(business.currentPeriodEnd))
        : null;

      if (currentEnd && currentEnd > now) {
        newEnd = new Date(currentEnd.getTime() + 30 * 24 * 60 * 60 * 1000);
      } else {
        newEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      }

      const updates = {
        subscriptionStatus: 'active',
        currentPeriodEnd: newEnd,
      };

      await updateDoc(doc(db, 'businesses', business.id), updates);
      setBusiness({ ...business, ...updates });
      alert('Added 30 days successfully.');
    } catch (error) {
      console.error('Error adding time:', error);
      alert('Failed to add time');
    }
  };

  const handleRevokeAccess = async () => {
    if (!business) return;
    if (!confirm('Are you sure you want to revoke access? This will immediately expire their subscription.')) return;
    
    try {
      const updates = {
        subscriptionStatus: 'canceled',
        currentPeriodEnd: new Date(),
      };

      await updateDoc(doc(db, 'businesses', business.id), updates);
      setBusiness({ ...business, ...updates });
      alert('Access revoked successfully.');
    } catch (error) {
      console.error('Error revoking access:', error);
      alert('Failed to revoke access');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!business) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/businesses" className="p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
            <p className="text-gray-500">Business Details & Metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleSuspend}
            className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors ${
              business.status === 'suspended'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
            {business.status === 'suspended' ? <CheckCircle size={20} /> : <ShieldAlert size={20} />}
            {business.status === 'suspended' ? 'Reactivate Business' : 'Suspend Business'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: Details */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="h-48 bg-gray-100 relative">
              {business.imageUrl ? (
                <img src={business.imageUrl} alt={business.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Store size={48} className="text-gray-300" />
                </div>
              )}
              <div className="absolute top-4 right-4">
                <span className={`px-3 py-1.5 text-sm font-bold rounded-full shadow-sm ${
                  business.status === 'suspended' 
                    ? 'bg-orange-500 text-white' 
                    : business.status === 'pending'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-green-500 text-white'
                }`}>
                  {business.status?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
              <div className="space-y-4 text-sm text-gray-600">
                <div className="flex gap-3">
                  <Store size={18} className="text-gray-400 shrink-0" />
                  <div>
                    <span className="block font-medium text-gray-900">Category</span>
                    {business.category || 'N/A'}
                  </div>
                </div>
                <div className="flex gap-3">
                  <MapPin size={18} className="text-gray-400 shrink-0" />
                  <div>
                    <span className="block font-medium text-gray-900">Address</span>
                    {business.address || 'N/A'}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Phone size={18} className="text-gray-400 shrink-0" />
                  <div>
                    <span className="block font-medium text-gray-900">Phone</span>
                    {business.phone || 'N/A'}
                  </div>
                </div>
                {business.description && (
                  <div className="pt-4 border-t border-gray-100">
                    <span className="block font-medium text-gray-900 mb-1">Description</span>
                    <p className="text-gray-600 leading-relaxed">{business.description}</p>
                  </div>
                )}
                {business.status === 'suspended' && business.suspensionReason && (
                  <div className="pt-4 border-t border-gray-100">
                    <span className="block font-medium text-orange-600 mb-1">Suspension Reason</span>
                    <p className="text-orange-800 bg-orange-50 p-3 rounded-lg border border-orange-100">{business.suspensionReason}</p>
                  </div>
                )}
                
                {/* Availability Section */}
                <div className="pt-4 border-t border-gray-100">
                  <span className="block font-medium text-gray-900 mb-2">Discovery Status</span>
                  <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                    business.isPaused 
                      ? 'bg-gray-50 border-gray-200 text-gray-500' 
                      : 'bg-green-50 border-green-100 text-green-700'
                  }`}>
                    {business.isPaused ? <Clock size={16} /> : <CheckCircle size={16} />}
                    <span className="font-semibold text-sm">
                      {business.isPaused ? 'Paused by Vendor' : 'Live on Discovery'}
                    </span>
                  </div>
                </div>

                {/* Business Hours */}
                {business.businessHours && (
                  <div className="pt-4 border-t border-gray-100">
                    <span className="block font-medium text-gray-900 mb-2">Operating Hours</span>
                    <div className="space-y-1.5">
                      {Object.entries(business.businessHours).map(([day, hours]: [string, any]) => (
                        <div key={day} className="flex justify-between text-xs">
                          <span className="font-medium text-gray-500">{day}</span>
                          <span className={hours.isOpen ? 'text-gray-900' : 'text-red-400 italic'}>
                            {hours.isOpen ? `${hours.open} - ${hours.close}` : 'Closed'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Metrics & Analytics */}
        <div className="xl:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric Cards */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Users size={20} className="text-blue-600" />
                </div>
              </div>
              <div>
                <h4 className="text-3xl font-bold text-gray-900 mb-1">{metrics.customers.toLocaleString()}</h4>
                <p className="text-sm font-medium text-gray-500">Enrolled Customers</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <Ticket size={20} className="text-indigo-600" />
                </div>
              </div>
              <div>
                <h4 className="text-3xl font-bold text-gray-900 mb-1">{business.totalStamps?.toLocaleString() || 0}</h4>
                <p className="text-sm font-medium text-gray-500">Total Stamps Issued</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <Gift size={20} className="text-green-600" />
                </div>
              </div>
              <div>
                <h4 className="text-3xl font-bold text-gray-900 mb-1">{metrics.redemptions.toLocaleString()}</h4>
                <p className="text-sm font-medium text-gray-500">Rewards Claimed</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <Star size={20} className="text-yellow-600 fill-yellow-600" />
                </div>
              </div>
              <div>
                <h4 className="text-3xl font-bold text-gray-900 mb-1">{metrics.averageRating.toFixed(1)} <span className="text-sm font-normal text-gray-400">({metrics.reviews})</span></h4>
                <p className="text-sm font-medium text-gray-500">Average Rating</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Subscription & Payments</h3>
                <p className="text-sm text-gray-500">Manage billing and access</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAdd30Days}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  + Add 30 Days
                </button>
                <button
                  onClick={handleRevokeAccess}
                  className="px-4 py-2 bg-white border border-gray-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
                >
                  Revoke Access
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div>
                  <span className="block text-sm font-medium text-gray-500 mb-1">Status</span>
                  <span className={`inline-flex px-3 py-1 text-sm font-bold rounded-full ${
                    business.subscriptionStatus === 'active' || business.subscriptionStatus === 'trialing' ? 'bg-green-100 text-green-700' :
                    business.subscriptionStatus === 'past_due' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {(business.subscriptionStatus || 'none').toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-500 mb-1">Current Plan</span>
                  <span className="text-gray-900 font-semibold">{business.planId || 'None'}</span>
                </div>
                <div>
                  <span className="block text-sm font-medium text-gray-500 mb-1">Period Ends</span>
                  <span className="text-gray-900 font-semibold">
                    {business.currentPeriodEnd 
                      ? (business.currentPeriodEnd.toDate 
                          ? business.currentPeriodEnd.toDate() 
                          : new Date(business.currentPeriodEnd)
                        ).toLocaleDateString() 
                      : 'N/A'}
                  </span>
                </div>
              </div>

              <h4 className="text-sm font-semibold text-gray-900 mb-4">Payment History</h4>
              {payments.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-sm text-gray-500">No payments recorded yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3 font-medium rounded-tl-lg">Date</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium rounded-tr-lg">Reference</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payments.map(payment => (
                        <tr key={payment.id}>
                          <td className="px-4 py-3 text-gray-900">
                            {payment.createdAt ? payment.createdAt.toDate().toLocaleDateString() : 'Unknown'}
                          </td>
                          <td className="px-4 py-3 text-gray-900">R {payment.amount}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              payment.status === 'successful' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 font-mono text-xs">{payment.id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
