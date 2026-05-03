import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import SignUpFormComponent from '../auth/SignUpForm';
import SignInFormComponent from '../auth/SignInForm';
import ResetPasswordFormComponent from '../auth/ResetPasswordForm';

export type Tab = "signin" | "signup" | "reset_password";

export default function AuthComponent({ setIsAuthVisible }: { setIsAuthVisible: (value: boolean) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<Tab>("signin");

  const containerRef = useRef<HTMLDivElement | null>(null);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsAuthVisible(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setIsAuthVisible]);

  const switchTab = (tab: Tab) => {
    // TODO: Reset Forms

    setError(null);
    setCurrentTab(tab);
  }

  const panelStyles = 'flex flex-col gap-4 bg-gradient-to-br from-background to-background/90 p-6 rounded-xl border border-border/60 relative m-6 shadow-2xl min-w-[320px] w-full max-w-sm';

  return (
    <AnimatePresence>
      <motion.div 
        className='fixed inset-0 z-110 flex items-center justify-center' 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <motion.div
          ref={containerRef}
          role='dialog'
          aria-modal='true'
          aria-labelledby='login-title'
          className={panelStyles + ' z-10'}
          initial={{ y: 28, opacity: 0, scale: 0.94 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 16, opacity: 0, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }}
          layout
        >
          <button
            className='absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer rounded-md focus:outline-none focus:ring-2 focus:ring-foreground/40'
            onClick={() => setIsAuthVisible(false)}
            aria-label='Close login modal'
          >
            <X className='w-5 h-5' />
          </button>

          <div className='flex flex-col items-center text-foreground mb-2 gap-2'>
            <div className='flex items-center justify-center rounded-full border border-border size-12 bg-background/40 backdrop-blur-sm shadow-inner overflow-hidden'>
              <Image src={"/papermind-light.png"} alt="Papermind Logo Light" height={200} width={200}></Image>
            </div>
            <h2 id='login-title' className='text-lg font-medium'>{currentTab === 'reset_password' ? 'Enter your email' : 'Welcome back'}</h2>
            <p className='text-xs text-gray-500'>{currentTab === 'reset_password' ? 'If your account is found, you\'ll receive an email' : 'Authenticate to continue.'}</p>
          </div>

          {/* Sign In Section */}
          {currentTab === "signin" && (
            <SignInFormComponent setIsAuthVisible={setIsAuthVisible} switchTab={switchTab}></SignInFormComponent>
          )}

          {/* Sign Up Section */}
          {currentTab === "signup" && (
            <SignUpFormComponent setIsAuthVisible={setIsAuthVisible} switchTab={switchTab} error={error} setError={setError}></SignUpFormComponent>
          )}

          {/* Reset Password Section */}
          {currentTab === "reset_password" && (
            <ResetPasswordFormComponent switchTab={switchTab} error={error} setError={setError}></ResetPasswordFormComponent>
          )}

        </motion.div>
        <motion.div className='fixed inset-0 bg-black/55 backdrop-blur-sm z-0' aria-hidden='true' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} onClick={() => setIsAuthVisible(false)} />
      </motion.div>
    </AnimatePresence>
  );
}