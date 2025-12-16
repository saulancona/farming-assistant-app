import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { convertBetweenCurrencies } from '../services/currency';
import ConfirmDialog from './ConfirmDialog';

export default function RestoreCurrency() {
  const [isRestoring, setIsRestoring] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<{
    expenses: Array<{ id: string; category: string; oldAmount: number; newAmount: number }>;
    income: Array<{ id: string; source: string; oldAmount: number; newAmount: number }>;
  } | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const log = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const previewChanges = async () => {
    setIsPreviewing(true);
    setLogs([]);
    log('Starting preview...');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        log('❌ No user found. Please sign in.');
        return;
      }

      log(`✓ Authenticated as: ${user.email}`);

      // Fetch exchange rate
      log('Fetching USD to KES exchange rate...');
      const rate = await convertBetweenCurrencies(1, 'USD', 'KES');
      log(`✓ Current rate: 1 USD = ${rate} KES`);

      // Get all expenses
      const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id);

      if (expError) {
        log(`❌ Error fetching expenses: ${expError.message}`);
        return;
      }

      log(`Found ${expenses?.length || 0} expenses`);

      // Get all income
      const { data: income, error: incError } = await supabase
        .from('income')
        .select('*')
        .eq('user_id', user.id);

      if (incError) {
        log(`❌ Error fetching income: ${incError.message}`);
        return;
      }

      log(`Found ${income?.length || 0} income items`);

      // Prepare preview data
      const expensePreview = expenses?.map((exp: any) => ({
        id: exp.id,
        category: exp.category,
        oldAmount: exp.amount,
        newAmount: Math.round(exp.amount * rate * 100) / 100
      })) || [];

      const incomePreview = income?.map((inc: any) => ({
        id: inc.id,
        source: inc.source,
        oldAmount: inc.amount,
        newAmount: Math.round(inc.amount * rate * 100) / 100
      })) || [];

      setPreviewData({
        expenses: expensePreview,
        income: incomePreview
      });

      log('✓ Preview complete! Review the changes below.');
    } catch (error: any) {
      log(`❌ Error: ${error.message}`);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleRestoreClick = () => {
    setShowRestoreConfirm(true);
  };

  const restoreData = async () => {
    setShowRestoreConfirm(false);
    setIsRestoring(true);
    setLogs([]);
    log('=== STARTING DATA RESTORATION ===');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        log('❌ No user found. Please sign in.');
        return;
      }

      log(`✓ Authenticated as: ${user.email}`);

      // Fetch exchange rate
      log('Fetching USD to KES exchange rate...');
      const rate = await convertBetweenCurrencies(1, 'USD', 'KES');
      log(`✓ Using rate: 1 USD = ${rate} KES`);

      // Restore expenses
      log('\nRestoring expenses...');
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id);

      if (expenses) {
        for (const expense of expenses) {
          const newAmount = Math.round(expense.amount * rate * 100) / 100;
          log(`  Converting: ${expense.category} ${expense.amount} → ${newAmount}`);

          const { error } = await supabase
            .from('expenses')
            .update({ amount: newAmount })
            .eq('id', expense.id);

          if (error) {
            log(`  ❌ Error updating expense ${expense.id}: ${error.message}`);
          } else {
            log(`  ✓ Updated`);
          }
        }
      }

      // Restore income
      log('\nRestoring income...');
      const { data: income } = await supabase
        .from('income')
        .select('*')
        .eq('user_id', user.id);

      if (income) {
        for (const incomeItem of income) {
          const newAmount = Math.round(incomeItem.amount * rate * 100) / 100;
          log(`  Converting: ${incomeItem.source} ${incomeItem.amount} → ${newAmount}`);

          const { error } = await supabase
            .from('income')
            .update({ amount: newAmount })
            .eq('id', incomeItem.id);

          if (error) {
            log(`  ❌ Error updating income ${incomeItem.id}: ${error.message}`);
          } else {
            log(`  ✓ Updated`);
          }
        }
      }

      log('\n✓✓✓ DATA RESTORATION COMPLETE! ✓✓✓');
      log('Please refresh the page to see updated values.');

      setTimeout(() => {
        window.location.reload();
      }, 3000);

    } catch (error: any) {
      log(`❌ Error during restoration: ${error.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Restore Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRestoreConfirm}
        title="Confirm Data Restoration"
        message="This will permanently modify your database! All expenses and income will be converted from USD to KES. This action cannot be undone. Are you sure you want to continue?"
        confirmLabel="Yes, Restore Data"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={restoreData}
        onCancel={() => setShowRestoreConfirm(false)}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🔧 Restore Currency Data
        </h1>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <AlertTriangle className="text-yellow-400 mr-3" size={24} />
            <div>
              <h3 className="font-bold text-yellow-800">Warning</h3>
              <p className="text-yellow-700 text-sm mt-1">
                This tool will convert all your expenses and income from USD back to KES.
                It assumes your data was originally in KES and got corrupted when converting to USD.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <h3 className="font-bold text-blue-800 mb-2">How it works:</h3>
          <ol className="list-decimal list-inside text-blue-700 text-sm space-y-1">
            <li>Fetches current exchange rate (USD to KES)</li>
            <li>Multiplies all expense and income amounts by this rate</li>
            <li>Updates all records in the database</li>
          </ol>
          <p className="text-blue-700 text-sm mt-2">
            <strong>Example:</strong> 10.03 USD → ~1,304 KES (at rate ~130)
          </p>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={previewChanges}
            disabled={isPreviewing || isRestoring}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            <Eye size={20} />
            {isPreviewing ? 'Loading...' : 'Preview Changes'}
          </button>

          <button
            onClick={handleRestoreClick}
            disabled={isRestoring || isPreviewing || !previewData}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
          >
            <RefreshCw size={20} />
            {isRestoring ? 'Restoring...' : 'Restore Data (USD → KES)'}
          </button>
        </div>

        {previewData && (
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 mb-3">Preview of Changes:</h3>

            {previewData.expenses.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">Expenses ({previewData.expenses.length}):</h4>
                <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {previewData.expenses.map(exp => (
                    <div key={exp.id} className="flex justify-between text-sm py-1">
                      <span className="text-gray-600">{exp.category}</span>
                      <span className="text-gray-900">
                        ${exp.oldAmount.toFixed(2)} → KES {exp.newAmount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewData.income.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Income ({previewData.income.length}):</h4>
                <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {previewData.income.map(inc => (
                    <div key={inc.id} className="flex justify-between text-sm py-1">
                      <span className="text-gray-600">{inc.source}</span>
                      <span className="text-gray-900">
                        ${inc.oldAmount.toFixed(2)} → KES {inc.newAmount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {logs.length > 0 && (
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className="mb-1">{log}</div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
