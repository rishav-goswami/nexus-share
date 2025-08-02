
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Icon } from '../Icon';
import { Spinner } from '../Spinner';

const SYNC_DURATIONS: Record<string, number> = {
    'Last Hour': 60 * 60 * 1000,
    'Last 24 Hours': 24 * 60 * 60 * 1000,
    'All Time': Infinity,
};

export const SettingsModal: React.FC = () => {
    const { 
        settings, 
        user,
        isSettingsOpen, 
        setIsSettingsOpen, 
        handleUpdateSettings,
        handleUpdateProfile,
        handleClearAllData
    } = useAppContext();

    const [currentSettings, setCurrentSettings] = useState(settings);
    const [name, setName] = useState(user.name);

    useEffect(() => {
        setCurrentSettings(settings);
    }, [settings]);
    
    if (!isSettingsOpen || !currentSettings) return null;

    const handleSettingChange = (key: keyof typeof currentSettings, value: any) => {
        const newSettings = { ...currentSettings, [key]: value };
        setCurrentSettings(newSettings);
        handleUpdateSettings(newSettings);
    };
    
    const handleNameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && name.trim() !== user.name) {
            handleUpdateProfile(name.trim());
        }
    }

    return (
        <div 
            className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-50 p-4"
            onClick={() => setIsSettingsOpen(false)}
        >
            <div 
                className="w-full max-w-lg p-6 md:p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg relative max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={() => setIsSettingsOpen(false)} className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white rounded-full">
                    <Icon name="x-circle" className="w-8 h-8" />
                </button>

                <h2 className="text-3xl font-bold text-white mb-4">Settings</h2>
                
                {/* Profile Settings */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-cyan-400 border-b border-gray-700 pb-2">Profile</h3>
                    <form onSubmit={handleNameSubmit} className="space-y-2">
                        <label htmlFor="displayName" className="block text-sm font-medium text-gray-300">Display Name</label>
                        <div className="flex gap-2">
                            <input
                                id="displayName"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="flex-grow px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                            />
                            <button type="submit" disabled={!name.trim() || name.trim() === user.name} className="px-4 py-2 font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors">
                                Save
                            </button>
                        </div>
                    </form>
                </div>
                
                {/* Sync Settings */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-cyan-400 border-b border-gray-700 pb-2">Sync Settings</h3>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-700 rounded-md">
                        <div>
                            <label htmlFor="publicSquareSync" className="font-medium text-white">Public Square Sync</label>
                            <p className="text-xs text-gray-400">Disable to ignore messages from the global room.</p>
                        </div>
                        <button
                            id="publicSquareSync"
                            onClick={() => handleSettingChange('disablePublicSquareSync', !currentSettings.disablePublicSquareSync)}
                            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${currentSettings.disablePublicSquareSync ? 'bg-gray-600' : 'bg-cyan-500'}`}
                        >
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${currentSettings.disablePublicSquareSync ? 'translate-x-1' : 'translate-x-6'}`} />
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Sync History From Peers</label>
                        <div className="flex flex-col sm:flex-row gap-2 rounded-md">
                            {Object.entries(SYNC_DURATIONS).map(([label, value]) => (
                                <button
                                    key={label}
                                    onClick={() => handleSettingChange('syncDurationMs', value)}
                                    className={`flex-1 text-center px-3 py-2 text-sm rounded-md transition-colors ${currentSettings.syncDurationMs === value ? 'bg-cyan-600 font-semibold text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Data Management */}
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-cyan-400 border-b border-gray-700 pb-2">Data Management</h3>
                    <div className="flex items-center justify-between p-3 bg-gray-700 rounded-md">
                         <div>
                            <p className="font-medium text-white">Clear All Local Data</p>
                            <p className="text-xs text-gray-400">Deletes all messages, files, and settings from this device.</p>
                        </div>
                         <button onClick={handleClearAllData} className="px-4 py-2 font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors">
                            Clear Data
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
