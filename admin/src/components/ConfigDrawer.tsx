import React, { useState, useEffect } from 'react';
import { Database, X, Settings, RefreshCw, CheckCircle, AlertCircle, Save, Sliders } from 'lucide-react';
import { getActiveMode, setDatabaseMode, isSupabaseConnected, supabase } from '../lib/supabase';

interface ConfigDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConfigDrawer({ isOpen, onClose }: ConfigDrawerProps) {
  const [currentMode, setCurrentMode] = useState<'supabase' | 'local'>('local');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    setCurrentMode(getActiveMode());
    setSupabaseUrl(localStorage.getItem('bt_supabase_url') || (import.meta as any).env.VITE_SUPABASE_URL || (import.meta as any).env.NEXT_PUBLIC_SUPABASE_URL || '');
    setSupabaseKey(localStorage.getItem('bt_supabase_key') || (import.meta as any).env.VITE_SUPABASE_ANON_KEY || (import.meta as any).env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
  }, [isOpen]);

  const handleModeChange = (mode: 'supabase' | 'local') => {
    setDatabaseMode(mode);
    setCurrentMode(mode);
    window.location.reload(); // Reload to re-initialize Supabase client
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('bt_supabase_url', supabaseUrl.trim());
    localStorage.setItem('bt_supabase_key', supabaseKey.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
    
    // Automatically check connection and trigger reload
    setTestStatus('testing');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const testConnection = async () => {
    setTestStatus('testing');
    try {
      if (!supabase) {
        setTestStatus('error');
        setTestMessage('Supabase client is not initialized. Enter valid credentials and save first.');
        return;
      }
      
      const { data, error } = await supabase.from('products').select('count', { count: 'exact', head: true });
      if (error) {
        setTestStatus('error');
        setTestMessage(`Failed: ${error.message}. Ensure tables are created!`);
      } else {
        setTestStatus('success');
        setTestMessage('Successfully connected! Tables found in Supabase.');
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(`Connection Error: ${err.message || err}`);
    }
  };

  const clearCustomCredentials = () => {
    localStorage.removeItem('bt_supabase_url');
    localStorage.removeItem('bt_supabase_key');
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
      {/* Backdrop Closer */}
      <div className="absolute inset-0" onClick={onClose} />
      
      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-white border-l border-slate-200 text-slate-900 flex flex-col h-full shadow-2xl z-10 animate-slide-in">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900">System Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Section 1: Database Engine Mode */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="h-4 w-4 text-indigo-600" />
                Database Engine Mode
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Toggle between the live Supabase cloud database and the client-side localStorage sandbox.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleModeChange('supabase')}
                disabled={!isSupabaseConnected}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all cursor-pointer ${
                  currentMode === 'supabase'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600'
                } ${!isSupabaseConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${currentMode === 'supabase' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200'}`}>
                  <Database className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Supabase Live</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Cloud PostgreSQL</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('local')}
                className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition-all cursor-pointer ${
                  currentMode === 'local'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${currentMode === 'local' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200'}`}>
                  <RefreshCw className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Local Sandbox</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Browser Local Storage</div>
                </div>
              </button>
            </div>

            {!isSupabaseConnected && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-bold">Supabase is not initialized</p>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    Live mode is locked because no valid credentials are set. Provide your database credentials below to unlock.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Supabase Credentials */}
          <div className="space-y-4 border-t border-slate-100 pt-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Settings className="h-4 w-4 text-indigo-600" />
                Supabase Credentials
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Connect your custom Supabase instance. Overrides default .env values if set here.
              </p>
            </div>

            <form onSubmit={handleSaveCredentials} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-semibold">SUPABASE URL</label>
                <input
                  type="url"
                  placeholder="https://your-project.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-slate-900 placeholder-slate-400 rounded-lg p-2.5 text-xs outline-none transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-500 font-semibold">SUPABASE ANON KEY</label>
                <textarea
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-slate-900 placeholder-slate-400 rounded-lg p-2.5 text-xs h-20 outline-none transition-colors font-mono resize-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-xs rounded-lg py-2.5 px-4 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSaved ? 'Saved!' : 'Save & Hot-Reload'}
                </button>
                
                {(localStorage.getItem('bt_supabase_url') || localStorage.getItem('bt_supabase_key')) && (
                  <button
                    type="button"
                    onClick={clearCustomCredentials}
                    className="bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-red-600 text-xs rounded-lg px-3 transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Section 3: Connection Diagnostics */}
          {isSupabaseConnected && (
            <div className="space-y-4 border-t border-slate-100 pt-6">
              <div>
                <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  Database Diagnostician
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Run standard queries to verify read permissions and schema setup on your active Supabase DB.
                </p>
              </div>

              <button
                onClick={testConnection}
                disabled={testStatus === 'testing'}
                className="w-full bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs rounded-lg py-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${testStatus === 'testing' ? 'animate-spin text-indigo-500' : ''}`} />
                Test Table Read Permission
              </button>

              {testStatus === 'success' && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs flex items-start gap-2 animate-fade-in">
                  <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                  <div>
                    <span className="font-bold block">Read Success!</span>
                    <span className="text-[11px] text-slate-600">{testMessage}</span>
                  </div>
                </div>
              )}

              {testStatus === 'error' && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-lg text-xs flex items-start gap-2 animate-fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                  <div>
                    <span className="font-bold block">Read Failure</span>
                    <span className="text-[11px] text-slate-600">{testMessage}</span>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 text-center text-[10px] text-slate-500 font-mono">
          Blue Technology Admin Panel v1.0.0
        </div>
      </div>
    </div>
  );
}
