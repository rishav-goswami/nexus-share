import React, { useState, useEffect, useRef } from 'react';
import type { User } from './types';
import { storageService } from './services/storage.service';
import { Spinner } from './components/Spinner';
import { LoginScreen } from './components/Auth/LoginScreen';
import MainApplication from './MainApplication';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const cleanupIntervalRef = useRef<number | null>(null);

  // Cleanup old items and check for persisted user on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        await storageService.cleanupOldItems();
        // Also run cleanup periodically for long-running sessions
        cleanupIntervalRef.current = window.setInterval(() => {
          storageService.cleanupOldItems();
        }, 60 * 60 * 1000); // Cleanup every hour

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

    // Cleanup on unmount
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
  };

  const handleLogout = () => {
     if (window.confirm("Are you sure you want to log out?")) {
        localStorage.removeItem('nexus-user');
        if (cleanupIntervalRef.current) {
            clearInterval(cleanupIntervalRef.current);
            cleanupIntervalRef.current = null;
        }
        setUser(null);
     }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <MainApplication user={user} onLogout={handleLogout} />;
};

export default App;
