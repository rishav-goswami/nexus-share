import React from 'react';
import { Icon } from './Icon';

interface LandingPageProps {
  onLoginRequest: () => void;
}

const FeatureCard: React.FC<{ icon: React.ComponentProps<typeof Icon>['name']; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-gray-800 p-6 rounded-lg shadow-lg transition-transform hover:scale-105">
    <Icon name={icon} className="w-10 h-10 text-cyan-400 mb-4" />
    <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
    <p className="text-gray-400">{children}</p>
  </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginRequest }) => {
  return (
    <div className="bg-gray-900 text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-10 bg-gray-900 bg-opacity-70 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Nexus Share</h1>
          <button
            onClick={onLoginRequest}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center animate-gradient relative overflow-hidden">
        <div className="text-center p-6 z-10">
          <h2 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-4">
            Share Anything. Instantly. Securely.
          </h2>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Nexus Share is a decentralized, peer-to-peer platform for real-time messaging and file sharing. No servers, no logs, just pure connection.
          </p>
          <button
            onClick={onLoginRequest}
            className="bg-cyan-500 hover:bg-cyan-600 text-white font-extrabold py-4 px-8 rounded-lg text-lg transition-all transform hover:scale-105"
          >
            Get Started for Free
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-900">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Why Choose Nexus Share?</h2>
            <p className="text-gray-400 mt-2">Experience the future of direct communication.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard icon="share-nodes" title="Truly Decentralized">
              Communicate directly with peers using WebRTC. No central server stores your messages or files.
            </FeatureCard>
            <FeatureCard icon="chat-bubble" title="Real-time Messaging">
              Enjoy instant, ephemeral text conversations with rich formatting for code, bold, and italics.
            </FeatureCard>
            <FeatureCard icon="shield-check" title="Secure File Sharing">
              Share files of any size directly from your device to others, with end-to-end encryption provided by WebRTC.
            </FeatureCard>
            <FeatureCard icon="cloud-arrow-down" title="Offline Sync">
              Missed a message while you were offline? Nexus Share automatically syncs your history from other peers when you reconnect.
            </FeatureCard>
          </div>
        </div>
      </section>
      
      {/* How it Works Section */}
      <section className="py-20 bg-gray-800">
        <div className="container mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-12">Simple to Get Started</h2>
            <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16">
                <div className="flex items-center gap-4 max-w-xs">
                    <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-2xl font-bold bg-cyan-600 text-white rounded-full">1</div>
                    <p className="text-lg text-left">Choose a unique display name to identify yourself to your peers.</p>
                </div>
                <div className="flex items-center gap-4 max-w-xs">
                    <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-2xl font-bold bg-cyan-600 text-white rounded-full">2</div>
                    <p className="text-lg text-left">Create a new private room or instantly join an existing one by name.</p>
                </div>
                 <div className="flex items-center gap-4 max-w-xs">
                    <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-2xl font-bold bg-cyan-600 text-white rounded-full">3</div>
                    <p className="text-lg text-left">Start sharing messages and files securely with everyone in the room.</p>
                </div>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-6">
        <div className="container mx-auto px-6 text-center text-gray-400">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span>Made with</span> <Icon name="heart" className="w-5 h-5 text-red-500" /> <span>by Rishav</span>
          </div>
           <a href="https://github.com/rishav-sharma-cse" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-cyan-400 transition-colors">
            <Icon name="github" className="w-5 h-5" />
            <span>View on GitHub</span>
          </a>
        </div>
      </footer>
    </div>
  );
};
