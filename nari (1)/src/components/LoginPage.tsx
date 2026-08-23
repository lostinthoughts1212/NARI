import React, { useState } from 'react';
import { Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabaseClient';

interface LoginPageProps {
  onNavigateBack: () => void;
}

export default function LoginPage({ onNavigateBack }: LoginPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      setErrorMsg(error.message || 'Failed to authenticate with Google');
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#F5EBE0] text-[#450920] font-sans antialiased flex flex-col justify-center items-center px-4 relative overflow-hidden"
      id="nari-login-container"
    >
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#A53860]/[0.08] blur-[120px] rounded-full pointer-events-none" />

      {/* Back button */}
      <div className="absolute top-8 left-6 md:left-12">
        <button
          onClick={onNavigateBack}
          className="text-xs uppercase tracking-widest text-[#450920] hover:text-[#A53860] transition-colors flex items-center gap-2 cursor-pointer font-bold"
        >
          ← Back to Overview
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F9DBBD] border border-[#f0c39c] text-[9px] uppercase tracking-widest text-[#A53860] mb-2 font-mono font-bold shadow-sm">
            <Sparkles className="w-3 h-3 text-[#A53860]" />
            NARI AUTH GATEWAY
          </div>
          <h2 className="text-3xl font-serif text-[#450920] tracking-tight italic font-bold">
            Guardian Login
          </h2>
          <p className="text-xs text-[#450920] font-semibold max-w-xs mx-auto">
            Secure authentication for NARI Women's Safety Network.
          </p>
        </div>

        {/* Card Container */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="p-6 md:p-8 rounded-2xl border border-[#f0c39c] bg-[#F9DBBD] shadow-md relative text-center"
        >
          {errorMsg && (
            <div className="mb-4 p-3 bg-[#A53860]/10 border border-[#A53860]/40 rounded-xl text-[11px] text-[#450920] font-bold">
              ⚠️ {errorMsg}
            </div>
          )}

          <p className="text-xs text-[#450920] font-bold mb-6">
            Log in or sign up to access the safety network.
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-3.5 bg-white text-[#450920] border border-[#f0c39c] hover:border-[#A53860] font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-[#FFF9F5] transition-all flex items-center justify-center gap-3 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-[#A53860] border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.67 15.71 16.85 16.94 15.61 17.77V20.46H19.17C21.25 18.54 22.56 15.67 22.56 12.25Z" fill="#4285F4"/>
                <path d="M12 23C14.97 23 17.46 22.02 19.29 20.46L15.73 17.77C14.74 18.43 13.48 18.84 12 18.84C9.13 18.84 6.7 16.91 5.84 14.3H2.17V17.14C3.98 20.74 7.69 23 12 23Z" fill="#34A853"/>
                <path d="M5.84 14.3C5.62 13.64 5.5 12.94 5.5 12.22C5.5 11.5 5.62 10.8 5.84 10.14V7.3H2.17C1.43 8.78 1 10.45 1 12.22C1 13.99 1.43 15.66 2.17 17.14L5.84 14.3Z" fill="#FBBC05"/>
                <path d="M12 5.6C13.61 5.6 15.06 6.16 16.21 7.25L19.36 4.1C17.46 2.33 14.97 1.22 12 1.22C7.69 1.22 3.98 3.48 2.17 7.3L5.84 10.14C6.7 7.53 9.13 5.6 12 5.6Z" fill="#EA4335"/>
              </svg>
            )}
            {isLoading ? 'Connecting...' : 'Continue with Google'}
          </button>
        </motion.div>

        {/* Security Watermark */}
        <p className="text-center text-[8px] font-mono text-[#450920] uppercase tracking-[0.25em] mt-8 font-bold flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-[#A53860]" />
          NARI Cryp-Shield Protocol • ECC-256 Enabled
        </p>
      </div>
    </div>
  );
}
