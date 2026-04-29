'use client';

import { useEffect, useState } from 'react';
import { db, storage } from '@/lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { Flag, ImageOff, Trash2, CheckCircle, Store } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────

interface BusinessPhoto {
  id: string;
  name: string;
  imageUrl: string;
  category?: string;
}

interface FlaggedReview {
  id: string;
  businessId: string;
  businessName?: string;
  customerId: string;
  rating: number;
  ratingLabel?: string;
  flaggedAt?: any;
  createdAt?: any;
}

const EMOJIS = ['😡', '😕', '😐', '🙂', '😍'];
const LABELS = ['Awful', 'Bad', 'OK', 'Good', 'Loved it!'];

// ── Page ──────────────────────────────────────────────────────────

export default function ModerationPage() {
  const [tab, setTab] = useState<'photos' | 'reviews'>('photos');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Content Moderation</h1>
      <p className="text-gray-500 mb-6">Review business photos and flagged customer reviews.</p>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setTab('photos')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'photos'
              ? 'bg-indigo-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Business Photos
        </button>
        <button
          onClick={() => setTab('reviews')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'reviews'
              ? 'bg-indigo-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Flagged Reviews
        </button>
      </div>

      {tab === 'photos' ? <PhotosTab /> : <ReviewsTab />}
    </div>
  );
}

// ── Photos tab ────────────────────────────────────────────────────

function PhotosTab() {
  const [photos, setPhotos] = useState<BusinessPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    const snap = await getDocs(collection(db, 'businesses'));
    const list: BusinessPhoto[] = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as BusinessPhoto))
      .filter((b) => !!b.imageUrl);
    setPhotos(list);
    setLoading(false);
  };

  const handleRemovePhoto = async (business: BusinessPhoto) => {
    if (!confirm(`Remove the profile photo for "${business.name}"? This cannot be undone.`)) return;

    try {
      // Try to delete from Storage (may fail if URL is external — that's fine)
      try {
        const storageRef = ref(storage, business.imageUrl);
        await deleteObject(storageRef);
      } catch {
        // URL might not be a Firebase Storage path — ignore
      }

      await updateDoc(doc(db, 'businesses', business.id), { imageUrl: null });
      setPhotos((prev) => prev.filter((b) => b.id !== business.id));
    } catch (err) {
      console.error('Failed to remove photo:', err);
      alert('Failed to remove photo.');
    }
  };

  if (loading) return <Spinner />;

  if (photos.length === 0) {
    return (
      <EmptyState
        icon={<ImageOff size={40} className="text-gray-300" />}
        message="No business photos uploaded yet."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {photos.map((biz) => (
        <div
          key={biz.id}
          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
        >
          <div className="relative h-48 bg-gray-100">
            <img
              src={biz.imageUrl}
              alt={biz.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                <Store size={16} className="text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm leading-tight">{biz.name}</p>
                {biz.category && (
                  <p className="text-xs text-gray-500 mt-0.5">{biz.category}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => handleRemovePhoto(biz)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 size={14} />
              Remove Photo
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Flagged reviews tab ───────────────────────────────────────────

function ReviewsTab() {
  const [reviews, setReviews] = useState<FlaggedReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    const snap = await getDocs(
      query(collection(db, 'reviews'), where('flagged', '==', true))
    );

    // Resolve business names
    const businessIds = [...new Set(snap.docs.map((d) => d.data().businessId).filter(Boolean))];
    const bizNames: Record<string, string> = {};
    await Promise.all(
      businessIds.map(async (id) => {
        const bizSnap = await getDocs(
          query(collection(db, 'businesses'), where('__name__', '==', id))
        );
        if (!bizSnap.empty) bizNames[id] = bizSnap.docs[0].data().name ?? id;
      })
    );

    const list: FlaggedReview[] = snap.docs.map((d) => ({
      id: d.id,
      businessName: bizNames[d.data().businessId] ?? d.data().businessId,
      ...d.data(),
    }));
    list.sort(
      (a, b) =>
        (b.flaggedAt?.toMillis?.() ?? 0) - (a.flaggedAt?.toMillis?.() ?? 0)
    );
    setReviews(list);
    setLoading(false);
  };

  const handleDismiss = async (id: string) => {
    await updateDoc(doc(db, 'reviews', id), { flagged: false });
    setReviews((prev) => prev.filter((r) => r.id !== id));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this review?')) return;
    await deleteDoc(doc(db, 'reviews', id));
    setReviews((prev) => prev.filter((r) => r.id !== id));
  };

  if (loading) return <Spinner />;

  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={<Flag size={40} className="text-gray-300" />}
        message="No flagged reviews. All clear!"
      />
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const safeRating = Math.max(0, Math.min(4, review.rating ?? 2));
        const flaggedDate = review.flaggedAt?.toDate
          ? review.flaggedAt.toDate().toLocaleDateString()
          : '—';
        const createdDate = review.createdAt?.toDate
          ? review.createdAt.toDate().toLocaleDateString()
          : '—';

        return (
          <div
            key={review.id}
            className="bg-white rounded-xl border border-orange-200 shadow-sm p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <span className="text-4xl leading-none">
                  {EMOJIS[safeRating]}
                </span>
                <div>
                  <p className="font-semibold text-gray-900">
                    {LABELS[safeRating]}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    For{' '}
                    <span className="font-medium text-gray-700">
                      {review.businessName}
                    </span>
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>Posted {createdDate}</span>
                    <span>·</span>
                    <span className="text-orange-500 font-medium">
                      Flagged {flaggedDate}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleDismiss(review.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-100 text-green-700 text-sm font-medium rounded-lg hover:bg-green-100 transition-colors"
                >
                  <CheckCircle size={14} />
                  Keep
                </button>
                <button
                  onClick={() => handleDelete(review.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      {icon}
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}
