'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Store,
  Users,
  LogOut,
  Clock,
  Settings,
  ShieldCheck,
  Sparkles,
  ShieldAlert,
  BarChart3,
  Zap,
} from 'lucide-react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/approvals', label: 'Approvals', icon: Clock },
  { href: '/businesses', label: 'Businesses', icon: Store },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/moderation', label: 'Moderation', icon: ShieldCheck },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const VERSION = '1.2';
const VERSION_KEY = `bp_admin_version_seen_${VERSION}`;

const whatsNew = [
  { icon: ShieldAlert, text: 'Firestore security rules hardened — customers now correctly access their own loyalty data.' },
  { icon: BarChart3,  text: 'Business detail metrics fixed — Rewards Claimed now queries the correct field.' },
  { icon: Zap,        text: 'Last Visited stat on customer profiles now populates on every vendor scan.' },
];

function VersionModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-[fadeScaleIn_0.25s_ease-out]">

        {/* Header gradient */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-8 pt-8 pb-10 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="font-bold text-white text-sm">BP</span>
            </div>
            <span className="text-white/80 text-sm font-medium tracking-wide uppercase">Bin Perks Admin</span>
          </div>
          <div className="flex items-end gap-3">
            <h2 className="text-4xl font-extrabold tracking-tight">v{VERSION}</h2>
            <span className="mb-1 inline-flex items-center gap-1 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
              <Sparkles size={12} />
              What&apos;s New
            </span>
          </div>
          <p className="mt-2 text-white/70 text-sm">Released 14 May 2026</p>
        </div>

        {/* Body */}
        <div className="bg-white px-8 py-6">
          <ul className="space-y-4">
            {whatsNew.map(({ icon: Icon, text }, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0 w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <Icon size={15} className="text-indigo-600" />
                </span>
                <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
              </li>
            ))}
          </ul>

          <button
            onClick={onClose}
            className="mt-7 w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm py-3 rounded-xl transition-colors"
          >
            Get Started
          </button>
          <p className="mt-3 text-center text-xs text-gray-400">
            This message won&apos;t show again this session.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.93) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>
    </div>
  );
}

export default function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showVersion, setShowVersion] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user is admin
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      if (userData?.role !== 'admin') {
        await signOut(auth);
        router.push('/login');
        return;
      }

      setLoading(false);

      if (!sessionStorage.getItem(VERSION_KEY)) {
        setShowVersion(true);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleCloseVersion = () => {
    sessionStorage.setItem(VERSION_KEY, '1');
    setShowVersion(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {showVersion && <VersionModal onClose={handleCloseVersion} />}
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">BP</span>
            </div>
            <span className="font-semibold text-gray-900">Bin Perks Admin</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-indigo-50 text-indigo-600' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={20} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
