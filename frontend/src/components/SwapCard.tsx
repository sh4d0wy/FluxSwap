import React from 'react';
import { useState } from 'react';
import { useEffect } from 'react';
import { ArrowUpDown, Wallet } from 'lucide-react';
import TokenSelect from './TokenSelect';
import AmountInput from './AmountInput';
import ConnectWalletButton from './ConnectWalletButton';

const SwapCard: React.FC = () => {
  const [fromNetwork, setFromNetwork] = useState<string>('');
  const [fromAsset, setFromAsset] = useState<string>('');
  const [toNetwork, setToNetwork] = useState<string>('');
  const [toAsset, setToAsset] = useState<string>('');

  // Auto-select assets based on network selection
  useEffect(() => {
    if (fromNetwork === 'ethereum') {
      setFromAsset('eth');
    } else if (fromNetwork === 'ton') {
      setFromAsset('ton');
    }
  }, [fromNetwork]);

  useEffect(() => {
    if (toNetwork === 'ethereum') {
      setToAsset('eth');
    } else if (toNetwork === 'ton') {
      setToAsset('ton');
    }
  }, [toNetwork]);

  const handleSwap = () => {
    // Swap the values
    const tempNetwork = fromNetwork;
    const tempAsset = fromAsset;
    setFromNetwork(toNetwork);
    setFromAsset(toAsset);
    setToNetwork(tempNetwork);
    setToAsset(tempAsset);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
    


      {/* Swap Container */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
        {/* From Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-300">From</label>
            {fromNetwork === 'ton' && (
              <button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-500/50">
                <div className="flex items-center space-x-1">
                  <Wallet size={12} />
                  <span>Connect</span>
                </div>
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TokenSelect 
              placeholder="Source" 
              type="network" 
              value={fromNetwork}
              onChange={setFromNetwork}
            />
            <TokenSelect 
              placeholder="Asset" 
              type="asset" 
              value={fromAsset}
              onChange={setFromAsset}
            />
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <button 
            onClick={handleSwap}
            className="p-3 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 rounded-xl transition-all duration-200 hover:scale-105 group"
          >
            <ArrowUpDown size={20} className="text-gray-300 group-hover:rotate-180 transition-transform duration-300" />
          </button>
        </div>

        {/* To Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-300">To</label>
            {toNetwork === 'ton' && (
              <button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-500/50">
                <div className="flex items-center space-x-1">
                  <Wallet size={12} />
                  <span>Connect</span>
                </div>
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TokenSelect 
              placeholder="Destination" 
              type="network" 
              value={toNetwork}
              onChange={setToNetwork}
            />
            <TokenSelect 
              placeholder="Asset" 
              type="asset" 
              value={toAsset}
              onChange={setToAsset}
            />
          </div>
        </div>

        {/* Amount Section */}
        <div className="mb-5">
          <AmountInput />
        </div>

        {/* Connect Wallet Button */}
        <ConnectWalletButton />
      </div>
    </div>
  );
};

export default SwapCard;