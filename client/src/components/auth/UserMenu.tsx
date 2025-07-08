import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useResendVerificationEmail } from '../../hooks/useAuthQueries';

export const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [message, setMessage] = useState('');
  const resendVerificationMutation = useResendVerificationEmail();

  const handleResendVerification = async () => {
    try {
      await resendVerificationMutation.mutateAsync();
      setMessage('Verification email sent! Please check your inbox.');
    } catch (error) {
      setMessage('Failed to send verification email. Please try again.');
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
          {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
        </div>
        <span>{user.name || user.email}</span>
        <svg
          className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg py-2 z-50">
          <div className="px-4 py-2 border-b">
            <p className="text-sm font-medium text-gray-900">{user.name || 'User'}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            {!user.isEmailVerified && (
              <div className="mt-2">
                <p className="text-xs text-orange-600">Email not verified</p>
                <button
                  onClick={handleResendVerification}
                  disabled={resendVerificationMutation.isPending}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                >
                  {resendVerificationMutation.isPending ? 'Sending...' : 'Resend verification email'}
                </button>
                {message && (
                  <p className="text-xs text-green-600 mt-1">{message}</p>
                )}
              </div>
            )}
          </div>
          
          <button
            onClick={() => {
              logout();
              setShowDropdown(false);
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};