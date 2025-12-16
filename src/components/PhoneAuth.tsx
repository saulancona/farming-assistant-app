import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Phone, ArrowRight, Loader } from 'lucide-react';

interface PhoneAuthProps {
  onSuccess?: () => void;
  mode?: 'signin' | 'signup' | 'link';
}

export function PhoneAuth({ onSuccess, mode = 'signin' }: PhoneAuthProps) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      // Format phone number (ensure it includes country code)
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

      if (mode === 'link') {
        // Linking existing email account with phone
        const { error } = await supabase.auth.updateUser({
          phone: formattedPhone,
        });

        if (error) throw error;
        setMessage('Verification code sent to your phone');
        setStep('otp');
      } else {
        // Sign in or sign up with phone
        const { error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
        });

        if (error) throw error;
        setMessage('Verification code sent to your phone');
        setStep('otp');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

      if (mode === 'link') {
        // Verify phone for account linking
        const { error } = await supabase.auth.verifyOtp({
          phone: formattedPhone,
          token: otp,
          type: 'phone_change',
        });

        if (error) throw error;
        setMessage('Phone number linked successfully!');
        onSuccess?.();
      } else {
        // Verify OTP for sign in/sign up
        const { error } = await supabase.auth.verifyOtp({
          phone: formattedPhone,
          token: otp,
          type: 'sms',
        });

        if (error) throw error;
        setMessage('Phone verified successfully!');
        onSuccess?.();
      }
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) throw error;
      setMessage('New verification code sent');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Phone className="w-6 h-6 text-green-600" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {mode === 'link' ? 'Link Phone Number' : step === 'phone' ? 'Phone Sign In' : 'Verify Code'}
        </h2>
      </div>

      {step === 'phone' ? (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+254712345678"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              required
              disabled={loading}
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Include country code (e.g., +254 for Kenya)
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {message && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !phoneNumber}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                Send Verification Code
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Verification Code
            </label>
            <input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              maxLength={6}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-center text-2xl tracking-widest"
              required
              disabled={loading}
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Enter the 6-digit code sent to {phoneNumber}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {message && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={loading}
            >
              Change Number
            </button>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={handleResendOTP}
            disabled={loading}
            className="w-full text-sm text-green-600 dark:text-green-400 hover:underline disabled:opacity-50"
          >
            Resend code
          </button>
        </form>
      )}
    </div>
  );
}
