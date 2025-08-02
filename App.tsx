
import React, { useState, useEffect, useRef } from 'react';
import type { User } from './types';
import { storageService } from './services/storage.service';
import { Spinner } from './components/Spinner';
import { LoginScreen } from './components/Auth/LoginScreen';
import MainApplication from './MainApplication';
import { LandingPage } from './components/LandingPage';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const cleanupIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        await storageService.cleanupOldItems();
        cleanupIntervalRef.current = window.setInterval(() => {
          storageService.cleanupOldItems();
        }, 60 * 60 * 1000);

        const savedUser = localStorage.getItem('nexus-user');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser) as User;
          setUser(parsedUser);
        }
      } catch (error) {
        console.error("Failed during initialization:", error);
        localStorage.removeItem('nexus-user');
      } finally {
        setIsInitialized(true);
      }
    };
    initialize();

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, []);

  const handleLogin = (name: string) => {
    const newUser: User = { id: crypto.randomUUID(), name };
    localStorage.setItem('nexus-user', JSON.stringify(newUser));
    setUser(newUser);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
     // Confirmation can be handled by the caller if needed
    localStorage.removeItem('nexus-user');
    if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
        cleanupIntervalRef.current = null;
    }
    setUser(null);
  };

  const handleUserUpdate = (updatedUser: User) => {
    localStorage.setItem('nexus-user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };


  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LandingPage onLoginRequest={() => setShowLoginModal(true)} />
        {showLoginModal && (
          <LoginScreen onLogin={handleLogin} onClose={() => setShowLoginModal(false)} />
        )}
      </>
    );
  }

  return <MainApplication user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />;
};

export default App;
