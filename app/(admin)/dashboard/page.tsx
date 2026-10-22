'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, DocumentData } from 'firebase/firestore';
import { Store, Users, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface Stats {
  totalBusinesses: number;
  totalUsers: number;
  totalStamps: number;
  categoryData: { name: string; value: number }[];
  monthlyData: { month: string; users: number; businesses: number }[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

type TimestampLike = { toDate?: () => Date; seconds?: number } | string | number | null | undefined;

function toDate(ts: TimestampLike): Date | null {
  if (!ts) return null;
  if (typeof ts === 'object') {
    if (ts.toDate) return ts.toDate();
    if (ts.seconds !== undefined) return new Date(ts.seconds * 1000);
    return null;
  }
  return new Date(ts);
}

function buildStats(
  businesses: DocumentData[],
  users: DocumentData[],
  stampRecordsByVendor: { [vendorId: string]: number }
): Stats {
  // The business counter can miss stamps, and vendors can delete stamp
  // records from their history, so take whichever is higher per business.
  const totalStamps = businesses.reduce(
    (acc, b) => acc + Math.max(b.totalStamps || 0, stampRecordsByVendor[b.id] || 0),
    0
  );

  // Category distribution
  const categoryCount: { [key: string]: number } = {};
  businesses.forEach(b => {
    const cat = b.category || 'Uncategorized';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });
  const categoryData = Object.entries(categoryCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Monthly growth data (last 6 months, cumulative). Docs created before the
  // window, or without a createdAt, count from the start so the final
  // point matches the totals above.
  const countCreatedBefore = (docs: DocumentData[], end: Date) =>
    docs.filter(d => {
      const created = toDate(d.createdAt);
      return !created || created < end;
    }).length;

  const now = new Date();
  const monthlyData = Array.from({ length: 6 }).map((_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    return {
      month: start.toLocaleString('default', { month: 'short' }),
      users: countCreatedBefore(users, end),
      businesses: countCreatedBefore(businesses, end)
    };
  });

  return {
    totalBusinesses: businesses.length,
    totalUsers: users.length,
    totalStamps,
    categoryData,
    monthlyData
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalBusinesses: 0,
    totalUsers: 0,
    totalStamps: 0,
    categoryData: [],
    monthlyData: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Live listeners so the cards and charts move as data changes
    let businesses: DocumentData[] = [];
    let users: DocumentData[] = [];
    let stampRecordsByVendor: { [vendorId: string]: number } = {};
    const loaded = new Set<string>();

    const update = (source: string) => {
      loaded.add(source);
      if (loaded.size < 3) return;
      setStats(buildStats(businesses, users, stampRecordsByVendor));
      setLoading(false);
    };
    const onError = (source: string) => (error: Error) => {
      console.error(`Error listening to ${source}:`, error);
      update(source);
    };

    const unsubscribers = [
      onSnapshot(collection(db, 'businesses'), snap => {
        businesses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        update('businesses');
      }, onError('businesses')),
      onSnapshot(collection(db, 'users'), snap => {
        users = snap.docs.map(doc => doc.data());
        update('users');
      }, onError('users')),
      onSnapshot(collection(db, 'stamps'), snap => {
        stampRecordsByVendor = {};
        snap.docs.forEach(doc => {
          const vendorId = doc.data().vendorId;
          if (vendorId) stampRecordsByVendor[vendorId] = (stampRecordsByVendor[vendorId] || 0) + 1;
        });
        update('stamps');
      }, onError('stamps')),
    ];

    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, []);

  const statCards = [
    { label: 'Total Businesses', value: stats.totalBusinesses, icon: Store, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-green-50 text-green-600' },
    { label: 'Total Stamps', value: stats.totalStamps.toLocaleString(), icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-500 mb-8">Overview of your platform</p>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Growth Chart */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Platform Growth</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={2} name="Users" />
                <Line type="monotone" dataKey="businesses" stroke="#10b981" strokeWidth={2} name="Businesses" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Chart */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Business Categories</h3>
          <div className="h-64">
            {stats.categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No category data available
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-4 justify-center">
            {stats.categoryData.map((cat, index) => (
              <div key={cat.name} className="flex items-center gap-2 text-sm">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-gray-600">{cat.name}</span>
                <span className="text-gray-400">({cat.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Distribution Bar Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Businesses by Category</h3>
        <div className="h-64">
          {stats.categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" width={120} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No category data available
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <a 
            href="/businesses" 
            className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
          >
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
              <Store size={20} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Manage Businesses</h3>
              <p className="text-sm text-gray-500">View and edit business listings</p>
            </div>
          </a>

          <a 
            href="/users" 
            className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <Users size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Manage Users</h3>
              <p className="text-sm text-gray-500">View user accounts and roles</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
