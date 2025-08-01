import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface TokenSelectProps {
  placeholder: string;
  type: 'network' | 'asset';
  value?: string;
  onChange?: (value: string) => void;
}

const TokenSelect: React.FC<TokenSelectProps> = ({ placeholder, type, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const networkOptions = [
    { value: 'ethereum', label: 'Ethereum', icon: '⟠' },
    { value: 'ton', label: 'TON', icon: '💎' }
  ];

  const assetOptions = [
    { value: 'eth', label: 'ETH', icon: '⟠' },
    { value: 'ton', label: 'TON', icon: '💎' }
  ];

  const options = type === 'network' ? networkOptions : assetOptions;
  const selectedOption = options.find(option => option.value === value);

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-700/30 border border-slate-600/50 rounded-xl px-4 py-3 text-left text-gray-300 hover:bg-slate-700/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {selectedOption ? (
              <>
                {/* <span className="text-lg">{selectedOption.icon}</span> */}
                <span className="text-sm font-medium text-white">{selectedOption.label}</span>
              </>
            ) : (
              <span className="text-sm font-medium">{placeholder}</span>
            )}
          </div>
          <ChevronDown 
            size={16} 
            className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </div>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600/50 rounded-xl shadow-xl z-20 overflow-hidden">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className="w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-colors duration-150 flex items-center space-x-2 text-gray-300 hover:text-white"
              >
                {/* <span className="text-lg">{option.icon}</span> */}
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TokenSelect;