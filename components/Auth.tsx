import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { BookOpenIcon } from './Icons';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      // FIX: Changed `signInWithPassword` to `signIn` for Supabase v1 compatibility.
      const { error } = await supabase.auth.signIn({ email, password });
      if (error) throw error;
      // The onAuthStateChange listener in App.tsx will handle the session update.
    } catch (error: any) {
      setError(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setError(null);
    setMessage(null);
    if (!email) {
      setError("Please enter your email address to reset your password.");
      return;
    }
    setLoading(true);
    try {
      // FIX: Changed `resetPasswordForEmail` to `api.resetPasswordForEmail` for Supabase v1 compatibility.
      const { error } = await supabase.auth.api.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setMessage("Check your email for the password reset link.");
    } catch (error: any) {
      setError(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <img src="https://i.postimg.cc/TYYjfM7n/Nexus-logo.jpg" alt="Nexus Logo" className="w-40 mx-auto" />
            <h1 className="text-3xl font-extrabold mt-4">Welcome to Nexus</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Sign in to continue your learning journey.</p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-700"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 dark:bg-gray-700"
                />
              </div>
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={loading}
                  className="text-sm font-medium text-pink-600 hover:text-pink-500 focus:outline-none disabled:opacity-50"
                >
                  Forgot Password?
                </button>
              </div>
            </div>
            
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            {message && <p className="text-green-500 text-sm text-center">{message}</p>}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:bg-gray-400"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
           <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Don't have an account?{' '}
            <a href="#" className="font-medium text-pink-600 hover:text-pink-500">
              Contact administrator
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};