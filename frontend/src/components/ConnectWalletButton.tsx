import React from 'react';
import { Wallet } from 'lucide-react';

const ConnectWalletButton: React.FC = () => {
  const handleConnect = () => {
    // Wallet connection logic would go here
    console.log('Connecting wallet...');
  };

  return (
    <button
      onClick={handleConnect}
      className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg hover:shadow-pink-500/25 focus:outline-none focus:ring-2 focus:ring-pink-500/50 active:scale-[0.98]"
    >
      <div className="flex items-center justify-center space-x-2">
        <Wallet size={20} />
        <span>Connect a wallet</span>
      </div>
    </button>
  );
};

export default ConnectWalletButton;