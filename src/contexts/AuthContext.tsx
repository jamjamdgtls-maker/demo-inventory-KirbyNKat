import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, SUPERADMIN_EMAILS } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/constants';
import { User, UserRole, UserStatus } from '@/types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isApproved: boolean;
  isPending: boolean;
  isRejected: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  canManageUsers: boolean;
  canManageInventory: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, fbUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              id: fbUser.uid,
              email: userData.email,
              displayName: userData.displayName,
              photoURL: userData.photoURL,
              role: userData.role as UserRole,
              status: userData.status as UserStatus,
              createdAt: userData.createdAt?.toDate() || new Date(),
              updatedAt: userData.updatedAt?.toDate() || new Date(),
              lastLoginAt: userData.lastLoginAt?.toDate(),
            });
            
            // Update last login
            await updateDoc(doc(db, COLLECTIONS.USERS, fbUser.uid), {
              lastLoginAt: serverTimestamp(),
            });
          } else {
            setUser(null);
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          setError('Failed to load user data');
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      
      // Check if user exists in Firestore
      const userDocRef = doc(db, COLLECTIONS.USERS, fbUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create new user
        const isSuperAdmin = SUPERADMIN_EMAILS.includes(fbUser.email || '');
        const newUser: Omit<User, 'id'> = {
          email: fbUser.email || '',
          displayName: fbUser.displayName || 'Unknown User',
          photoURL: fbUser.photoURL || undefined,
          role: isSuperAdmin ? 'SUPERADMIN' : 'USER',
          status: isSuperAdmin ? 'APPROVED' : 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date(),
        };
        
        await setDoc(userDocRef, {
          ...newUser,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        });
        
        setUser({ id: fbUser.uid, ...newUser });
      } else {
        // Existing user - data will be loaded by onAuthStateChanged
        const userData = userDoc.data();
        setUser({
          id: fbUser.uid,
          email: userData.email,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          role: userData.role as UserRole,
          status: userData.status as UserStatus,
          createdAt: userData.createdAt?.toDate() || new Date(),
          updatedAt: userData.updatedAt?.toDate() || new Date(),
          lastLoginAt: new Date(),
        });
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err: any) {
      console.error('Sign out error:', err);
      setError(err.message || 'Failed to sign out');
    }
  };

  const isAuthenticated = !!user;
  const isApproved = user?.status === 'APPROVED';
  const isPending = user?.status === 'PENDING';
  const isRejected = user?.status === 'REJECTED';
  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const canManageUsers = isSuperAdmin;
  const canManageInventory = isApproved;

  return (
    <AuthContext.Provider value={{
      firebaseUser,
      user,
      loading,
      error,
      signInWithGoogle,
      signOut,
      isAuthenticated,
      isApproved,
      isPending,
      isRejected,
      isSuperAdmin,
      isAdmin,
      canManageUsers,
      canManageInventory,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
