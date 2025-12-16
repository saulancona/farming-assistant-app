import { useState, useEffect } from 'react';
import { convertBetweenCurrencies, formatPrice, getPreferredCurrency } from '../services/currency';

interface ConvertedPriceProps {
  amount: number;
  className?: string;
  fromCurrency?: string; // Default is KES (base currency)
}

export default function ConvertedPrice({ amount, className = '', fromCurrency = 'KES' }: ConvertedPriceProps) {
  const [convertedAmount, setConvertedAmount] = useState<number>(amount);
  const [currency, setCurrency] = useState<string>('KES');

  useEffect(() => {
    const loadCurrency = () => {
      setCurrency(getPreferredCurrency());
    };

    loadCurrency();

    const handleSettingsSaved = () => {
      loadCurrency();
    };

    window.addEventListener('settingsSaved', handleSettingsSaved);
    return () => window.removeEventListener('settingsSaved', handleSettingsSaved);
  }, []);

  useEffect(() => {
    const convert = async () => {
      // If same currency, no conversion needed
      if (currency === fromCurrency) {
        setConvertedAmount(amount);
      } else {
        try {
          const converted = await convertBetweenCurrencies(amount, fromCurrency, currency);
          setConvertedAmount(converted);
        } catch (error) {
          console.error('Error converting price:', error);
          setConvertedAmount(amount);
        }
      }
    };
    convert();
  }, [amount, currency, fromCurrency]);

  return <span className={className}>{formatPrice(convertedAmount, currency)}</span>;
}
