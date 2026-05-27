import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { useStore } from '../store/useStore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { setUser, setUserData, setIsLoading } = useStore();
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData({ uid: user.uid, ...docSnap.data() });
          }
          setIsLoading(false);
        }, () => {
          setIsLoading(false);
        });

        return () => unsubscribeUser();
      } else {
        setUserData(null);
        setIsLoading(false);
      }
      
      setAuthInitialized(true);
    });

    return () => unsubscribe();
  }, [setUser, setUserData, setIsLoading]);

  return (
    <AuthContext.Provider value={{ authInitialized }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used within AuthProvider');
  return context;
};