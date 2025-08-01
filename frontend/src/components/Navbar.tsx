import React from 'react';
import { Wallet, MessageCircle, Menu } from 'lucide-react';

const Navbar: React.FC = () => {
  return (
    <div className="w-full fixed top-0 left-0 z-20 bg-white/5 backdrop-blur-lg shadow-md px-4 sm:px-8 py-3 border-b border-white/10 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
          <div className="w-6 h-6 bg-white rounded-sm"></div>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white whitespace-nowrap">FluxSwap</h1>
      </div>

      <div className="flex items-center space-x-1 sm:space-x-3 text-gray-400">
        <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
          <Wallet size={18} />
        </button>
        <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
          <MessageCircle size={18} />
        </button>
        <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
          <Menu size={18} />
        </button>
      </div>
    </div>
  );
};

export default Navbar;
