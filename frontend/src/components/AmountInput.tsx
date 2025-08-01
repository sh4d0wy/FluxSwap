import React, { useState } from 'react';

const AmountInput: React.FC = () => {
  const [amount, setAmount] = useState('');

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
      <div className="relative">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          className="w-full bg-slate-700/30 border border-slate-600/50 rounded-xl px-4 py-2 text-white text-lg font-medium placeholder-gray-500 hover:bg-slate-700/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {amount && (
          <button
            onClick={() => setAmount('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default AmountInput;