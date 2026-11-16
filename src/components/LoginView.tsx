import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { UserRole, UserSession } from '../types/radiology';

interface LoginViewProps {
  onLogin: (session: UserSession) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('keerthana@joinflexrads.com');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('trainee');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email address and password.');
      return;
    }

    const resolvedRole: UserRole =
      role === 'admin' || email.toLowerCase().includes('admin') ? 'admin' : 'trainee';

    if (resolvedRole === 'admin') {
      onLogin({
        id: 'admin-1',
        name: 'Dr. Arvind Menon',
        email: email.trim(),
        role: 'admin',
        title: 'Lead Clinical QA Admin',
      });
    } else {
      onLogin({
        id: 'tr-1',
        name: 'Dr. Keerthana R.',
        email: email.trim(),
        role: 'trainee',
        title: 'VRA2 Radiology Fellow',
      });
    }
  };

  const applyPreset = (targetRole: UserRole) => {
    setRole(targetRole);
    setError('');
    setEmail(
      targetRole === 'admin' ? 'admin@joinflexrads.com' : 'keerthana@joinflexrads.com'
    );
    setPassword('••••••••••••');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[380px]">
        {/* Brand Title */}
        <div className="mb-6 select-none">
          <h1 className="font-display text-3xl font-extrabold tracking-[0.22em] leading-[1.15] text-[#E11D48]">
            TRAINING
            <br />
            PLATFORM
          </h1>
        </div>

        <h2 className="font-display text-2xl font-bold text-slate-900 mb-6">Sign in</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              placeholder="Email address"
              aria-label="Email address"
              className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#E11D48] focus:ring-2 focus:ring-[#E11D48]/15"
            />
          </div>

          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Password"
              aria-label="Password"
              className="w-full h-11 pl-10 pr-10 rounded-lg border-2 border-[#E11D48] bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E11D48]/15"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-xs font-medium text-[#E11D48]" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full h-11 bg-[#E11D48] hover:bg-[#BE123C] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Sign in
          </button>
        </form>

        {/* Subtle Role Switcher for Demo / Admin Testing */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Demo role:</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => applyPreset('trainee')}
              className={`cursor-pointer transition-colors ${
                role === 'trainee' ? 'text-[#E11D48] font-semibold' : 'hover:text-slate-900'
              }`}
            >
              Trainee
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => applyPreset('admin')}
              className={`cursor-pointer transition-colors ${
                role === 'admin' ? 'text-[#E11D48] font-semibold' : 'hover:text-slate-900'
              }`}
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
