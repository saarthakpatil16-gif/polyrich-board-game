import React, { useState, useEffect, useRef } from 'react';
import { googleAuth, GoogleUserProfile } from '../../services/googleAuth';
import { X, Check, ShieldCheck, Key, Mail, User, Sparkles, ExternalLink, RefreshCw } from 'lucide-react';
import { soundFX } from '../../utils/audio';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: GoogleUserProfile | null;
  onLoginSuccess: (user: GoogleUserProfile) => void;
  onLogout: () => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'settings'>('signin');
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [clientIdInput, setClientIdInput] = useState(() => googleAuth.getClientId());
  const [clientIdSaved, setClientIdSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);
    const existingClientId = googleAuth.getClientId();
    setClientIdInput(existingClientId);

    // Try rendering official Google button if container and GIS are available
    if (googleBtnRef.current && existingClientId) {
      googleAuth.renderButton(googleBtnRef.current, (profile) => {
        soundFX.playCash();
        onLoginSuccess(profile);
        onClose();
      });
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleDirectSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailInput.trim();
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid Google email address (e.g. yourname@gmail.com).');
      return;
    }

    const name = nameInput.trim() || email.split('@')[0];
    const profile = googleAuth.connectDirect(name, email);
    soundFX.playCash();
    onLoginSuccess(profile);
    onClose();
  };

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    googleAuth.setClientId(clientIdInput.trim());
    setClientIdSaved(true);
    soundFX.playClick();
    setTimeout(() => {
      setClientIdSaved(false);
      setActiveTab('signin');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in font-sans">
      <div className="w-full max-w-md bg-[#101428] border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 relative overflow-hidden flex flex-col gap-5">
        {/* Ambient background glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center shadow-md">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Google Account Sign-In</h3>
              <p className="text-[11px] text-slate-400">Save & sync your custom boards permanently</p>
            </div>
          </div>
          <button
            onClick={() => { soundFX.playClick(); onClose(); }}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* If user is already signed in */}
        {currentUser ? (
          <div className="flex flex-col gap-4">
            <div className="bg-[#0b0e1e] p-4 rounded-2xl border border-indigo-500/30 flex items-center gap-3.5">
              <div className="relative shrink-0">
                {currentUser.picture ? (
                  <img src={currentUser.picture} alt={currentUser.name} className="w-12 h-12 rounded-full border-2 border-indigo-400 object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-base font-bold text-white">
                    {currentUser.name.charAt(0)}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0b0e1e]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white truncate">{currentUser.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5" /> Synced
                  </span>
                </div>
                <span className="text-xs text-slate-400 truncate block mt-0.5">{currentUser.email}</span>
                <span className="text-[10px] text-indigo-400 font-medium block mt-1">
                  ✓ Custom board templates automatically linked to this account
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  onLogout();
                  soundFX.playClick();
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 transition"
              >
                Sign Out
              </button>
              <button
                onClick={() => {
                  soundFX.playClick();
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Tabs */}
            <div className="flex bg-[#0b0e1e] p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => { soundFX.playClick(); setActiveTab('signin'); }}
                className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'signin' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" /> Connect Account
              </button>
              <button
                onClick={() => { soundFX.playClick(); setActiveTab('settings'); }}
                className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Key className="w-3.5 h-3.5" /> OAuth Client ID
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            {activeTab === 'signin' ? (
              <div className="flex flex-col gap-4">
                {/* Official Google Button slot if Client ID exists */}
                {googleAuth.getClientId() && (
                  <div className="flex flex-col items-center gap-2 py-1">
                    <span className="text-[11px] text-slate-400">One-click Google Sign-In:</span>
                    <div ref={googleBtnRef} className="flex justify-center" />
                    <div className="w-full flex items-center gap-2 my-2">
                      <div className="h-px bg-slate-800 flex-1" />
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">or connect directly</span>
                      <div className="h-px bg-slate-800 flex-1" />
                    </div>
                  </div>
                )}

                {/* Direct Google Account Connect Form */}
                <form onSubmit={handleDirectSignIn} className="flex flex-col gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-indigo-400" /> Google Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. saarthak.patil16@gmail.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#0b0e1e] border border-slate-700 focus:border-indigo-500 focus:outline-none text-xs text-white placeholder-slate-500 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                      <User className="w-3 h-3 text-indigo-400" /> Display Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Your Name (e.g. Sarthak Patil)"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#0b0e1e] border border-slate-700 focus:border-indigo-500 focus:outline-none text-xs text-white placeholder-slate-500 transition"
                    />
                  </div>

                  <p className="text-[10px] text-slate-400 leading-relaxed bg-[#0b0e1e] p-2.5 rounded-xl border border-slate-800">
                    <Sparkles className="w-3 h-3 text-amber-400 inline mr-1" />
                    Your customized board designs, custom cities, images, and rules will be tied to this Google account and will automatically restore whenever you play!
                  </p>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-neon transition active:scale-95 flex items-center justify-center gap-1.5 mt-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Connect Google Account & Load Board
                  </button>
                </form>
              </div>
            ) : (
              <form onSubmit={handleSaveClientId} className="flex flex-col gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Key className="w-3 h-3 text-indigo-400" /> Google Cloud OAuth 2.0 Client ID
                  </label>
                  <input
                    type="text"
                    placeholder="xxxxxxxxxxxx-xxxxxxxx.apps.googleusercontent.com"
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0b0e1e] border border-slate-700 focus:border-indigo-500 focus:outline-none text-xs text-white placeholder-slate-500 font-mono transition"
                  />
                </div>

                <div className="text-[11px] text-slate-400 space-y-1 bg-[#0b0e1e] p-3 rounded-xl border border-slate-800">
                  <div className="font-semibold text-slate-300 flex items-center gap-1">
                    How to get your free Google Client ID:
                  </div>
                  <ol className="list-decimal list-inside space-y-0.5 text-[10px] text-slate-400">
                    <li>Open <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="w-2.5 h-2.5" /></a></li>
                    <li>Click <strong>Create Credentials</strong> &rarr; <strong>OAuth Client ID</strong></li>
                    <li>Set Application Type to <strong>Web Application</strong></li>
                    <li>Add your domain to <strong>Authorized JavaScript Origins</strong> (e.g. <code className="text-slate-300 bg-slate-900 px-1 rounded">{window.location.origin}</code>)</li>
                    <li>Paste the generated Client ID above and click Save.</li>
                  </ol>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  {clientIdSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" /> Saved!
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" /> Save Google Client ID
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
