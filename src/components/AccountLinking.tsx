import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link2, Mail, Phone, Check, X, Loader, AlertCircle } from 'lucide-react';
import { PhoneAuth } from './PhoneAuth';
import ConfirmDialog from './ConfirmDialog';

interface LinkedAccount {
  id: string;
  auth_method: string;
  auth_identifier: string;
  is_verified: boolean;
  is_primary: boolean;
  linked_at: string;
}

export function AccountLinking() {
  const { user } = useAuth();
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPhoneLinking, setShowPhoneLinking] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [unlinkConfirm, setUnlinkConfirm] = useState<{ show: boolean; accountId: string | null }>({ show: false, accountId: null });

  useEffect(() => {
    if (user) {
      loadLinkedAccounts();
    }
  }, [user]);

  const loadLinkedAccounts = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('account_links')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false });

      if (fetchError) throw fetchError;
      setLinkedAccounts(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load linked accounts');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLinkSuccess = async () => {
    setMessage('Phone number linked successfully!');
    setShowPhoneLinking(false);
    await loadLinkedAccounts();

    // Auto-hide success message after 3 seconds
    setTimeout(() => setMessage(''), 3000);
  };

  const handleUnlinkAccount = async (accountId: string, isPrimary: boolean) => {
    if (isPrimary) {
      setError('Cannot unlink primary authentication method');
      return;
    }

    setUnlinkConfirm({ show: true, accountId });
  };

  const confirmUnlink = async () => {
    if (!unlinkConfirm.accountId) return;

    setUnlinkConfirm({ show: false, accountId: null });
    setLoading(true);
    setError('');

    try {
      const { error: deleteError } = await supabase
        .from('account_links')
        .delete()
        .eq('id', unlinkConfirm.accountId);

      if (deleteError) throw deleteError;

      setMessage('Account unlinked successfully');
      await loadLinkedAccounts();
    } catch (err: any) {
      setError(err.message || 'Failed to unlink account');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (accountId: string, authMethod: string) => {
    setLoading(true);
    setError('');

    try {
      // Remove primary status from all accounts
      await supabase
        .from('account_links')
        .update({ is_primary: false })
        .eq('user_id', user!.id);

      // Set new primary
      const { error: updateError } = await supabase
        .from('account_links')
        .update({ is_primary: true })
        .eq('id', accountId);

      if (updateError) throw updateError;

      setMessage(`${authMethod} is now your primary authentication method`);
      await loadLinkedAccounts();
    } catch (err: any) {
      setError(err.message || 'Failed to update primary account');
    } finally {
      setLoading(false);
    }
  };

  const hasEmail = linkedAccounts.some(acc => acc.auth_method === 'email');
  const hasPhone = linkedAccounts.some(acc => acc.auth_method === 'phone');

  if (!user) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          Please sign in to manage linked accounts
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        isOpen={unlinkConfirm.show}
        title="Unlink Account"
        message="Are you sure you want to unlink this account? You will no longer be able to sign in using this method."
        confirmLabel="Unlink"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmUnlink}
        onCancel={() => setUnlinkConfirm({ show: false, accountId: null })}
      />

      <div className="flex items-center gap-2 mb-4">
        <Link2 className="w-6 h-6 text-green-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Linked Accounts</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Link multiple authentication methods to access your account from any app
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {message && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-2">
          <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
        </div>
      )}

      {loading && linkedAccounts.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <Loader className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md divide-y divide-gray-200 dark:divide-gray-700">
            {linkedAccounts.map((account) => (
              <div key={account.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {account.auth_method === 'email' ? (
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  ) : account.auth_method === 'phone' ? (
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Phone className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  ) : null}

                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {account.auth_identifier}
                      </p>
                      {account.is_verified && (
                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <Check className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                      {account.is_primary && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                      {account.auth_method} • Linked {new Date(account.linked_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!account.is_primary && (
                    <>
                      <button
                        onClick={() => handleSetPrimary(account.id, account.auth_method)}
                        disabled={loading}
                        className="px-3 py-1 text-sm border border-green-600 text-green-600 rounded hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 transition-colors"
                      >
                        Set as Primary
                      </button>
                      <button
                        onClick={() => handleUnlinkAccount(account.id, account.is_primary)}
                        disabled={loading}
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50 transition-colors"
                        title="Unlink account"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {linkedAccounts.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No linked accounts found
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Link Another Account
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Add multiple authentication methods to access your account from AgroAfrica (web) and AgroVoice (mobile)
            </p>

            <div className="space-y-3">
              {!hasEmail && (
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Email</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Use email to sign in on web
                        </p>
                      </div>
                    </div>
                    <button
                      disabled
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  </div>
                </div>
              )}

              {!hasPhone && (
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Phone Number</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Use phone to sign in on mobile app
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowPhoneLinking(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Link Phone
                    </button>
                  </div>
                </div>
              )}

              {hasEmail && hasPhone && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center">
                  <Check className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                    All available authentication methods are linked!
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                    You can now access your account from AgroAfrica web and AgroVoice mobile
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {showPhoneLinking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 relative">
            <button
              onClick={() => setShowPhoneLinking(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
            <PhoneAuth mode="link" onSuccess={handlePhoneLinkSuccess} />
          </div>
        </div>
      )}
    </div>
  );
}
