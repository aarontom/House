import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login as apiLogin, getUser } from '../services/api';
import type { User } from '../types';

interface UserContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateBalance: (newBalance: number) => void;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved user in localStorage and validate it
    const validateUser = async () => {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          // Validate that user still exists in the database
          const freshUser = await getUser(parsedUser.id);
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        } catch (e) {
          // User doesn't exist anymore (database was reset) - clear stored data
          console.log('Stored user not found, clearing session');
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    validateUser();
  }, []);

  const login = async (email: string, password: string) => {
    const { user: loggedInUser, token } = await apiLogin(email, password);
    setUser(loggedInUser);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    localStorage.setItem('token', token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const updateBalance = (newBalance: number) => {
    if (user) {
      const updatedUser = { ...user, balance: newBalance };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const refreshUser = async () => {
    if (user) {
      try {
        const updatedUser = await getUser(user.id);
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } catch (e) {
        // User no longer exists
        logout();
      }
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, login, logout, updateBalance, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
