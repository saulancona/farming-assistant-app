import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Phone, Check, X } from 'lucide-react';

export default function PhoneAuthTest() {
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  const handleSendOTP = async () => {
    if (!phoneNumber) {
      setError('Please enter a phone number');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
      });

      if (otpError) throw otpError;

      setMessage('✅ SMS sent! Check your phone for the verification code.');
      setStep('verify');
    } catch (err: any) {
      setError('❌ Error: ' + (err.message || 'Failed to send SMS'));
      console.error('OTP Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: code,
        type: 'sms',
      });

      if (verifyError) throw verifyError;

      setMessage('🎉 SUCCESS! You are now logged in!');
      setUser(data.user);
      console.log('Logged in user:', data.user);
    } catch (err: any) {
      setError('❌ Error: ' + (err.message || 'Invalid code'));
      console.error('Verify Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep('phone');
    setPhoneNumber('');
    setCode('');
    setMessage('');
    setError('');
    setUser(null);
  };

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Phone Auth Works! 🎉</h2>
            <p className="text-gray-600 mb-6">You successfully logged in with phone number</p>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-600 mb-1">Phone:</p>
              <p className="text-lg font-semibold text-gray-900">{user.phone}</p>

              <p className="text-sm text-gray-600 mb-1 mt-3">User ID:</p>
              <p className="text-xs font-mono text-gray-700 break-all">{user.id}</p>
            </div>

            <button
              onClick={handleReset}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Test Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Test Phone Authentication</h2>
          <p className="text-gray-600 mt-2">
            {step === 'phone'
              ? 'Enter your phone number to receive an SMS code'
              : 'Enter the 6-digit code we sent to your phone'
            }
          </p>
        </div>

        {step === 'phone' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number (with country code)
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+254712345678"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Examples: +254... (Kenya), +234... (Nigeria), +1... (USA)
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {message && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-600">{message}</p>
              </div>
            )}

            <button
              onClick={handleSendOTP}
              disabled={loading || !phoneNumber}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Sending...' : 'Send SMS Code'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-2xl tracking-widest font-bold"
              />
              <p className="text-xs text-gray-500 mt-1">
                Sent to {phoneNumber}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {message && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-600">{message}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Change Number
              </button>
              <button
                onClick={handleVerifyOTP}
                disabled={loading || code.length !== 6}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>

            <button
              onClick={handleSendOTP}
              disabled={loading}
              className="w-full text-sm text-green-600 hover:underline"
            >
              Resend code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
