import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sprout, Phone, Mail, Lock, User, Eye, EyeOff, Loader, ArrowLeft, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthProps {
  onAuthSuccess: () => void;
}

type AuthMode = 'phone' | 'otp' | 'email-signin' | 'email-signup';

// Common African country codes
const countryCodes = [
  { code: '+254', country: 'Kenya', flag: '🇰🇪' },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
  { code: '+251', country: 'Ethiopia', flag: '🇪🇹' },
  { code: '+255', country: 'Tanzania', flag: '🇹🇿' },
  { code: '+256', country: 'Uganda', flag: '🇺🇬' },
  { code: '+233', country: 'Ghana', flag: '🇬🇭' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦' },
  { code: '+20', country: 'Egypt', flag: '🇪🇬' },
  { code: '+212', country: 'Morocco', flag: '🇲🇦' },
  { code: '+237', country: 'Cameroon', flag: '🇨🇲' },
  { code: '+225', country: "Côte d'Ivoire", flag: '🇨🇮' },
  { code: '+221', country: 'Senegal', flag: '🇸🇳' },
  { code: '+263', country: 'Zimbabwe', flag: '🇿🇼' },
  { code: '+260', country: 'Zambia', flag: '🇿🇲' },
  { code: '+265', country: 'Malawi', flag: '🇲🇼' },
  { code: '+258', country: 'Mozambique', flag: '🇲🇿' },
  { code: '+250', country: 'Rwanda', flag: '🇷🇼' },
  { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
];

export default function Auth({ onAuthSuccess }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>('phone');
  const [countryCode, setCountryCode] = useState('+254'); // Default Kenya
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/^0+/, '')}`;

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (!supabase) {
      setError('Authentication is not configured. Please use Demo Mode.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhoneNumber,
      });

      if (error) throw error;

      setMessage(`OTP sent to ${fullPhoneNumber}`);
      setMode('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!supabase) {
      setError('Authentication is not configured.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhoneNumber,
        token: otp,
        type: 'sms',
      });

      if (error) throw error;

      if (data.user) {
        onAuthSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!supabase) {
      setError('Authentication is not configured. Please use Demo Mode.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        onAuthSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (!supabase) {
      setError('Authentication is not configured. Please use Demo Mode.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        if (data.user.identities && data.user.identities.length === 0) {
          setError('An account with this email already exists');
        } else {
          setMessage('Account created! Please check your email to confirm your account.');
          setMode('email-signin');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const resetToPhone = () => {
    setMode('phone');
    setError('');
    setMessage('');
    setOtp('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-2xl mb-4 shadow-lg">
            <Sprout className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AgroAfrica</h1>
          <p className="text-gray-600">Farm Management System</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Error/Success Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm"
              role="alert"
              aria-live="polite"
            >
              {error}
            </motion.div>
          )}

          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm"
              role="status"
              aria-live="polite"
            >
              {message}
            </motion.div>
          )}

          {/* Phone Number Entry */}
          {mode === 'phone' && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in with Phone</h2>
              <p className="text-sm text-gray-600 mb-6">We'll send you a verification code</p>

              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label htmlFor="country-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <select
                    id="country-select"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    aria-label="Select your country code"
                  >
                    {countryCodes.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.country} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="phone-input" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} aria-hidden="true" />
                    <input
                      id="phone-input"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="712345678"
                      required
                      aria-label="Phone number without leading zero"
                      aria-describedby="phone-hint"
                    />
                  </div>
                  <p id="phone-hint" className="text-xs text-gray-500 mt-1">Enter without leading zero</p>
                </div>

                <button
                  type="submit"
                  disabled={loading || phoneNumber.length < 8}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      Sending Code...
                    </>
                  ) : (
                    'Send Verification Code'
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center mb-3">Or sign in with email</p>
                <button
                  onClick={() => setMode('email-signin')}
                  className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Mail size={18} />
                  Use Email Instead
                </button>
              </div>
            </>
          )}

          {/* OTP Verification */}
          {mode === 'otp' && (
            <>
              <button
                onClick={resetToPhone}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
                aria-label="Go back to phone number entry"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Back
              </button>

              <h2 className="text-xl font-semibold text-gray-900 mb-2">Enter Verification Code</h2>
              <p className="text-sm text-gray-600 mb-6">
                We sent a code to <strong>{fullPhoneNumber}</strong>
              </p>

              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <label htmlFor="otp-input" className="block text-sm font-medium text-gray-700 mb-2">
                    6-Digit Code
                  </label>
                  <input
                    id="otp-input"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="000000"
                    required
                    maxLength={6}
                    aria-label="Enter the 6-digit verification code"
                    autoComplete="one-time-code"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      Verify & Sign In
                    </>
                  )}
                </button>
              </form>

              <button
                onClick={handleSendOTP}
                disabled={loading}
                className="w-full mt-4 text-sm text-green-600 hover:text-green-700"
              >
                Didn't receive code? Resend
              </button>
            </>
          )}

          {/* Email Sign In */}
          {mode === 'email-signin' && (
            <>
              <button
                onClick={resetToPhone}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
                aria-label="Go back to phone sign in"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Back to Phone
              </button>

              <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setMode('email-signin')}
                  className="flex-1 py-2 px-4 rounded-md font-medium transition-all bg-white text-green-600 shadow-sm"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMode('email-signup');
                    setError('');
                    setMessage('');
                  }}
                  className="flex-1 py-2 px-4 rounded-md font-medium transition-all text-gray-600 hover:text-gray-900"
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleEmailSignIn} className="space-y-4" aria-label="Sign in form">
                <div>
                  <label htmlFor="signin-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} aria-hidden="true" />
                    <input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="your@email.com"
                      required
                      aria-label="Email address"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="signin-password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} aria-hidden="true" />
                    <input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="••••••••"
                      required
                      aria-label="Password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
            </>
          )}

          {/* Email Sign Up */}
          {mode === 'email-signup' && (
            <>
              <button
                onClick={resetToPhone}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
                aria-label="Go back to phone sign in"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Back to Phone
              </button>

              <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => {
                    setMode('email-signin');
                    setError('');
                    setMessage('');
                  }}
                  className="flex-1 py-2 px-4 rounded-md font-medium transition-all text-gray-600 hover:text-gray-900"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setMode('email-signup')}
                  className="flex-1 py-2 px-4 rounded-md font-medium transition-all bg-white text-green-600 shadow-sm"
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleEmailSignUp} className="space-y-4" aria-label="Sign up form">
                <div>
                  <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} aria-hidden="true" />
                    <input
                      id="signup-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="John Doe"
                      required
                      aria-label="Full name"
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} aria-hidden="true" />
                    <input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="your@email.com"
                      required
                      aria-label="Email address"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} aria-hidden="true" />
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="••••••••"
                      required
                      minLength={6}
                      aria-label="Password, at least 6 characters"
                      aria-describedby="password-hint"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p id="password-hint" className="text-xs text-gray-500 mt-1">At least 6 characters</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="animate-spin" size={20} />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}
