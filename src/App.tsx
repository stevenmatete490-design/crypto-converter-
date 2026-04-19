import { useEffect, useState, useMemo } from 'react';
import { 
  ArrowRightLeft, 
  TrendingUp, 
  RefreshCcw, 
  Wallet, 
  LineChart as ChartIcon,
  AlertCircle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format } from 'date-fns';
import { cn } from './lib/utils';

interface Currency {
  code: string;
  name: string;
  symbol: string;
  type: 'fiat' | 'crypto';
  id?: string;
}

const COMMON_CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', type: 'fiat' },
  { code: 'EUR', name: 'Euro', symbol: '€', type: 'fiat' },
  { code: 'GBP', name: 'British Pound', symbol: '£', type: 'fiat' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', type: 'fiat' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', type: 'fiat' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', type: 'fiat' },
  { code: 'bitcoin', name: 'Bitcoin', symbol: '₿', type: 'crypto', id: 'bitcoin' },
  { code: 'ethereum', name: 'Ethereum', symbol: 'Ξ', type: 'crypto', id: 'ethereum' },
  { code: 'solana', name: 'Solana', symbol: 'SOL', type: 'crypto', id: 'solana' },
  { code: 'cardano', name: 'Cardano', symbol: 'ADA', type: 'crypto', id: 'cardano' },
  { code: 'polkadot', name: 'Polkadot', symbol: 'DOT', type: 'crypto', id: 'polkadot' },
  { code: 'dogecoin', name: 'Dogecoin', symbol: 'Ð', type: 'crypto', id: 'dogecoin' },
];

export default function App() {
  const [fromCurrency, setFromCurrency] = useState<Currency>(COMMON_CURRENCIES[4]); // Bitcoin
  const [toCurrency, setToCurrency] = useState<Currency>(COMMON_CURRENCIES[0]); // USD
  const [amount, setAmount] = useState<number | string>(1);
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ date: string; value: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch conversion rate
  const fetchRate = async () => {
    setLoading(true);
    setError(null);
    try {
      let finalRate = 1;

      if (fromCurrency.type === 'crypto' || toCurrency.type === 'crypto') {
        // Use CoinGecko for crypto pairs or crypto-fiat
        const cryptoId = fromCurrency.type === 'crypto' ? fromCurrency.id : toCurrency.id;
        const vsCurrency = fromCurrency.type === 'crypto' ? toCurrency.code.toLowerCase() : fromCurrency.code.toLowerCase();
        
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=${vsCurrency}`);
        const data = await response.json();
        
        if (data[cryptoId!] && data[cryptoId!][vsCurrency]) {
          const rawRate = data[cryptoId!][vsCurrency];
          finalRate = fromCurrency.type === 'crypto' ? rawRate : 1 / rawRate;
        } else {
          throw new Error('Rate not found');
        }
      } else {
        // Use Open Exchange Rates for fiat-fiat
        const response = await fetch(`https://open.er-api.com/v6/latest/${fromCurrency.code}`);
        const data = await response.json();
        if (data.rates && data.rates[toCurrency.code]) {
          finalRate = data.rates[toCurrency.code];
        } else {
          throw new Error('Rate not found');
        }
      }
      setRate(finalRate);
    } catch (err) {
      setError('Failed to fetch current rate. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch 7-day history for the trend chart
  const fetchHistory = async () => {
    if (fromCurrency.type !== 'crypto' && toCurrency.type !== 'crypto') {
      setHistory([]); // Optional: implement fiat history if needed
      return;
    }

    try {
      const cryptoId = fromCurrency.type === 'crypto' ? fromCurrency.id : toCurrency.id;
      const vsCurrency = fromCurrency.type === 'crypto' ? toCurrency.code.toLowerCase() : fromCurrency.code.toLowerCase();
      
      const response = await fetch(`https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart?vs_currency=${vsCurrency}&days=7&interval=daily`);
      const data = await response.json();
      
      if (data.prices) {
        const formattedHistory = data.prices.map((p: [number, number]) => ({
          date: format(new Date(p[0]), 'MMM dd'),
          value: fromCurrency.type === 'crypto' ? p[1] : 1 / p[1]
        }));
        setHistory(formattedHistory);
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
    }
  };

  useEffect(() => {
    fetchRate();
    fetchHistory();
  }, [fromCurrency, toCurrency]);

  const convertedAmount = useMemo(() => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (rate === null || isNaN(numAmount)) return '0.00';
    
    return (numAmount * rate).toLocaleString(undefined, { 
      maximumFractionDigits: toCurrency.type === 'crypto' ? 8 : 2,
      minimumFractionDigits: 2
    });
  }, [amount, rate, toCurrency]);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-[#1A1A1A] px-4 py-8 md:py-16">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center space-x-2 px-3 py-1 bg-white border border-gray-200 rounded-full mb-4">
            <Wallet className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Global Exchange</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tight">
            Currency <span className="font-semibold text-blue-600">Converter</span>
          </h1>
          <p className="text-gray-500 max-w-md mx-auto">
            Real-time market rates for crypto and global currencies.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Converter Card */}
          <div className="lg:col-span-7 bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 p-6 md:p-8 space-y-8">
            <div className="space-y-6">
              {/* From */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">From</label>
                <div className="flex space-x-3">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full text-3xl font-medium bg-gray-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="0.00"
                    />
                  </div>
                  <select
                    value={fromCurrency.code}
                    onChange={(e) => setFromCurrency(COMMON_CURRENCIES.find(c => c.code === e.target.value)!)}
                    className="w-32 bg-gray-50 border-none rounded-2xl p-4 font-bold appearance-none cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    {COMMON_CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center -my-4 relative z-10">
                <button 
                  onClick={handleSwap}
                  className="bg-white border border-gray-100 shadow-lg p-3 rounded-full hover:scale-110 active:scale-95 transition-all text-blue-600"
                >
                  <ArrowRightLeft className="w-5 h-5 rotate-90" />
                </button>
              </div>

              {/* To */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-400">To</label>
                <div className="flex space-x-3">
                  <div className="flex-1 bg-blue-50/50 rounded-2xl p-4 flex items-center min-h-[76px]">
                    <span className={cn("text-3xl font-semibold text-blue-700", loading && "animate-pulse opacity-50")}>
                      {loading ? '...' : convertedAmount}
                    </span>
                  </div>
                  <select
                    value={toCurrency.code}
                    onChange={(e) => setToCurrency(COMMON_CURRENCIES.find(c => c.code === e.target.value)!)}
                    className="w-32 bg-gray-50 border-none rounded-2xl p-4 font-bold appearance-none cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    {COMMON_CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.code}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center space-x-3 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-400">
                <RefreshCcw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                <span>Last updated: {new Date().toLocaleTimeString()}</span>
              </div>
              <button 
                onClick={fetchRate}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                disabled={loading}
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Trend Section */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <h3 className="font-bold text-lg">7-Day Trend</h3>
                </div>
                <div className="text-xs font-semibold px-2 py-1 bg-green-50 text-green-600 rounded-md">
                  Active
                </div>
              </div>

              <div className="h-[200px] w-full">
                {history.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#9CA3AF'}}
                        minTickGap={20}
                      />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: 'none', 
                          borderRadius: '12px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}
                        labelStyle={{ color: '#9CA3AF', marginBottom: '4px', fontSize: '10px' }}
                        itemStyle={{ color: '#1A1A1A', fontWeight: 'bold' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#2563EB" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorValue)" 
                        dot={false}
                        activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 border-2 border-dashed border-gray-100 rounded-2xl">
                    <ChartIcon className="w-8 h-8 opacity-20" />
                    <p className="text-sm">Historical data unavailable for this pair</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-500">Market Price</span>
                  <span className="font-bold">{toCurrency.symbol}{rate?.toLocaleString() ?? '--'}</span>
                </div>
                <p className="text-[10px] uppercase tracking-tighter text-gray-400 text-center">
                  Market data provided by CoinGecko API
                </p>
              </div>
            </div>
            
            {/* Quick Stats / Info Widget */}
            <div className="bg-[#1A1A1A] rounded-3xl p-6 text-white overflow-hidden relative group">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative z-10 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-blue-400">Market Insight</h4>
                <p className="text-lg leading-snug">
                  {fromCurrency.name} is currently trading at {rate?.toLocaleString()} {toCurrency.code}.
                </p>
                <div className="flex gap-2">
                   {COMMON_CURRENCIES.slice(0, 3).map(c => (
                     <div key={c.code} className="px-2 py-1 bg-white/10 rounded text-[10px] font-mono">
                       {c.code}
                     </div>
                   ))}
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="pt-16 pb-8 text-center text-gray-400 text-xs tracking-wide">
          <p>© 2026 QUANTUM EXCHANGE • REAL-TIME DATA • ALL RIGHTS RESERVED</p>
        </footer>
      </div>
    </div>
  );
}
