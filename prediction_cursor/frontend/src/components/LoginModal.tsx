import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import { register } from '../services/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login } = useUser();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        const { user, token } = await register(formData.username, formData.email, formData.password);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
        window.location.reload();
      } else {
        await login(formData.email, formData.password);
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await login('demo@example.com', 'demo123');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-muted hover:text-white hover:bg-background transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-2xl font-bold text-white mb-2">
          {isRegister ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="text-muted mb-6">
          {isRegister 
            ? 'Sign up to start trading predictions' 
            : 'Login to access your portfolio'}
        </p>

        {/* Demo Login Button */}
        <button
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full mb-4 py-3 px-4 rounded-xl bg-gradient-to-r from-accent to-purple-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          ) : (
            'Quick Demo Login'
          )}
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-card px-4 text-muted">or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-muted mb-2">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
                placeholder="johndoe"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-muted mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-2">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-white placeholder-muted focus:outline-none focus:border-accent transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-no/10 border border-no/20 text-no text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-white text-background font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            ) : isRegister ? (
              'Create Account'
            ) : (
              'Login'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-accent hover:text-accent-hover font-medium"
          >
            {isRegister ? 'Login' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
