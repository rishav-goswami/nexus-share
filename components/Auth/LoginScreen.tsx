import React, { useState } from 'react';

export const LoginScreen: React.FC<{ onLogin: (name: string) => void }> = ({ onLogin }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onLogin(name.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg">
        <div className="text-center">
            <h1 className="text-4xl font-bold text-white">Nexus Share</h1>
            <p className="mt-2 text-gray-400">Decentralized P2P Sharing for Code & Files</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your display name"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-3 px-4 font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
};
