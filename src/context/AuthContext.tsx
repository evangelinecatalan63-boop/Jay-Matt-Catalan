import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleAuthProvider, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { UserProfile } from '../types/index.ts';

const BOOTSTRAP_ADMIN_EMAIL = 'mjay63510@gmail.com';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  authModalOpen: boolean;
  authModalMode: 'signin' | 'signup' | 'reset';
  openAuthModal: (mode?: 'signin' | 'signup' | 'reset') => void;
  closeAuthModal: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  updateUserProfile: (updates: Partial<Pick<UserProfile, 'displayName' | 'photoUrl' | 'bio' | 'favoriteHousemateId' | 'themePreference' | 'notificationsEnabled'>>) => Promise<void>;
  signOutUser: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('pbb_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'reset'>('signin');

  const applyThemeClass = useCallback((nextTheme: 'dark' | 'light') => {
    const root = document.documentElement;
    if (nextTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('pbb_theme', nextTheme);
    } catch {
      // Ignore storage errors in restricted iframes
    }
  }, []);

  useEffect(() => {
    applyThemeClass(theme);
  }, [theme, applyThemeClass]);

  const setTheme = useCallback(
    (nextTheme: 'dark' | 'light') => {
      setThemeState(nextTheme);
      applyThemeClass(nextTheme);
      if (auth.currentUser) {
        updateDoc(doc(db, 'users', auth.currentUser.uid), {
          themePreference: nextTheme,
          updatedAt: serverTimestamp(),
        }).catch(() => {
          // Silently ignore if profile is still initializing
        });
      }
    },
    [applyThemeClass]
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const syncUserDocument = useCallback(
    async (firebaseUser: User) => {
      const userRef = doc(db, 'users', firebaseUser.uid);
      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          const initialProfile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'PBB Fan',
            photoUrl: firebaseUser.photoURL || '',
            bio: '',
            favoriteHousemateId: '',
            role: 'user',
            themePreference: theme,
            notificationsEnabled: true,
          };
          await setDoc(userRef, {
            ...initialProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          setProfile(initialProfile);
        } else {
          const data = snap.data() as UserProfile;
          setProfile(data);
          if (data.themePreference === 'light' || data.themePreference === 'dark') {
            setThemeState(data.themePreference);
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`, false);
      }

      // Admin check (verified bootstrap email OR /admins/{uid} doc)
      let adminVerified =
        firebaseUser.emailVerified && firebaseUser.email === BOOTSTRAP_ADMIN_EMAIL;
      if (!adminVerified && firebaseUser.emailVerified) {
        try {
          const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
          adminVerified = adminSnap.exists();
        } catch {
          adminVerified = false;
        }
      }
      setIsAdmin(adminVerified);
    },
    [theme]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await syncUserDocument(firebaseUser);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [syncUserDocument]);

  const openAuthModal = useCallback((mode: 'signin' | 'signup' | 'reset' = 'signin') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleAuthProvider);
    setAuthModalOpen(false);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
    setAuthModalOpen(false);
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName: string) => {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (displayName.trim()) {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      }
      await sendEmailVerification(cred.user).catch(() => {});
      await syncUserDocument(cred.user);
      setAuthModalOpen(false);
    },
    [syncUserDocument]
  );

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  }, []);

  const updateUserProfile = useCallback(
    async (
      updates: Partial<
        Pick<
          UserProfile,
          | 'displayName'
          | 'photoUrl'
          | 'bio'
          | 'favoriteHousemateId'
          | 'themePreference'
          | 'notificationsEnabled'
        >
      >
    ) => {
      if (!auth.currentUser) throw new Error('You must be signed in.');
      const userRef = doc(db, 'users', auth.currentUser.uid);
      try {
        await updateDoc(userRef, {
          ...updates,
          updatedAt: serverTimestamp(),
        });
        setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
        if (updates.displayName) {
          await updateProfile(auth.currentUser, { displayName: updates.displayName }).catch(
            () => {}
          );
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
      }
    },
    []
  );

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    setProfile(null);
    setIsAdmin(false);
  }, []);

  const getIdToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        theme,
        setTheme,
        toggleTheme,
        authModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        resendVerificationEmail,
        updateUserProfile,
        signOutUser,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
