"use client"

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { GooeyEffect } from '@/components/effects/GooeyEffect';
import { Waves } from '@/components/ui/WavesBackground';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';

export default function ResetPasswordPage() {
  const pathname = usePathname();
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);

  const [formData, setFormData] = useState({ password: '', confirm_password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmPasswordRef = useRef<HTMLInputElement | null>(null);
  const submitBtnRef = useRef<HTMLButtonElement | null>(null);

  // Focus first field on mount
  useEffect(() => { passwordRef.current?.focus(); }, []);

  // Simple focus trap
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const focusableRefs = [passwordRef, confirmPasswordRef, submitBtnRef];
    const elements = focusableRefs.map(r => r.current).filter(Boolean) as HTMLElement[];
    if (!elements.length) return;
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, [passwordRef, confirmPasswordRef, submitBtnRef]);

  const validateFormData = () => {
    if (!formData.password) return 'Password is required';
    if (!formData.confirm_password || formData.password !== formData.confirm_password) return 'Both passwords must match';
    return null;
  }

  const resetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validation = validateFormData();
    if (validation) { setError(validation); return; }

    setError(null);
    setValidation(null);
    setIsSubmitting(true);

    try {
      const newFormData = {
        email: userEmail,
        password: formData.password,
        confirm_password: formData.confirm_password
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset_password_service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newFormData),
      });

      if (!res.ok) {
        setError('Password reset failed');
      }

      const data = await res.json();

      if (data && data.status === 200) {
        setValidation("Password reset successfully. Redirecting...");
        setTimeout(() => router.replace('/'), 3000);
      }
    } catch (error) {
      console.error(error);
      setError('Resetting password failed. Please try again');
    } finally {
      setIsSubmitting(false);
    }
  }

  const checkToken = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth${pathname}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) return 1;

      const data = await res.json();

      if (!data.content) return 1;

      return data.content as string;
    } catch (error) {
      console.error(error);
      return 1;
    }
  }, [pathname]);

  useEffect(() => {
    checkToken().then((data) => {
      if (data == 1) {
        router.replace('/');
      } else {
        setUserEmail(data as string);
      }
    });
  }, [checkToken, router]);

  const inputBase = 'p-2 border rounded-lg text-sm bg-background/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-foreground/40 transition shadow-sm border-border';
  const panelStyles = 'flex flex-col gap-4 bg-gradient-to-br from-background to-background/90 p-6 rounded-xl border border-border/60 relative m-6 shadow-2xl min-w-[320px] w-full max-w-sm';

  return (
    <div className="relative w-full overflow-hidden">
      <GooeyEffect />

      <div className="absolute inset-0 w-full pointer-events-none">
        <Waves
          lineColor={'rgba(0, 0, 0, 0.3)'}
          backgroundColor="transparent"
          waveSpeedX={0.02}
          waveSpeedY={0.01}
          waveAmpX={40}
          waveAmpY={20}
          friction={0.9}
          tension={0.01}
          maxCursorMove={120}
          xGap={12}
          yGap={36}
        />
      </div>

      <div className="flex flex-col gap-y-2 grow w-full max-w-screen-md place-self-center text-gray-300 min-h-screen z-40">
        <AnimatePresence>
          <motion.div className='fixed inset-0 z-110 flex items-center justify-center' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
            <motion.div
              ref={containerRef}
              role='dialog'
              aria-modal='true'
              aria-labelledby='login-title'
              onKeyDown={handleKeyDown}
              className={panelStyles + ' z-10'}
              initial={{ y: 28, opacity: 0, scale: 0.94 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }}
              layout
            >
              <div className='flex flex-col items-center text-foreground mb-2 gap-2'>
                <div className='flex items-center justify-center rounded-full border border-border size-12 bg-background/40 backdrop-blur-sm shadow-inner overflow-hidden'>
                  <Image src={"/papermind-light.png"} alt="Papermind Logo Light" height={200} width={200}></Image>
                </div>
                <h2 id='login-title' className='text-lg font-medium'>Welcome back</h2>
                <p className='text-xs text-gray-500'>Set a new password below</p>
              </div>

              {/* Reset Password Section */}
              <form onSubmit={resetPassword} className='flex flex-col gap-5 text-foreground'>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className='text-red-500 text-xs bg-red-500/10 border border-red-500/30 px-3 py-2 rounded-md'
                    role='alert'
                  >
                    {error}
                  </motion.div>
                )}

                {validation && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className='text-green-600 text-xs bg-green-500/10 border border-green-500/30 px-3 py-2 rounded-md'
                    role='alert'
                  >
                    {validation}
                  </motion.div>
                )}

                <div className='flex flex-col gap-1'>
                  <label className='text-xs font-medium' htmlFor='password'>Password</label>
                  <div className='relative'>
                    <input
                      ref={passwordRef}
                      type={showPassword ? 'text' : 'password'}
                      id='password'
                      value={formData.password}
                      onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                      placeholder={showPassword ? "password" : "********"}
                      autoComplete='password'
                      className={inputBase + ' w-full pr-8'}
                      disabled={isSubmitting}
                      aria-required='true'
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(s => !s)}
                      className='absolute inset-y-0 right-0 px-2 flex items-center text-gray-500 hover:text-foreground focus:outline-none'
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                    </button>
                  </div>
                </div>
                <div className='flex flex-col gap-1'>
                  <label className='text-xs font-medium' htmlFor='confirm_password'>Confirm Password</label>
                  <div className='relative'>
                    <input
                      ref={confirmPasswordRef}
                      type={showPassword ? 'text' : 'password'}
                      id='confirm_password'
                      value={formData.confirm_password}
                      onChange={(e) => setFormData(p => ({ ...p, confirm_password: e.target.value }))}
                      placeholder={showPassword ? "password" : "********"}
                      autoComplete='confirm_password'
                      className={inputBase + ' w-full pr-8'}
                      disabled={isSubmitting}
                      aria-required='true'
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(s => !s)}
                      className='absolute inset-y-0 right-0 px-2 flex items-center text-gray-500 hover:text-foreground focus:outline-none'
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                    </button>
                  </div>
                </div>

                <button
                  ref={submitBtnRef}
                  type='submit'
                  disabled={isSubmitting}
                  className='inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-foreground text-background text-sm font-medium hover:bg-gray-900 disabled:opacity-60 disabled:cursor-not-allowed shadow focus:outline-none focus:ring-2 focus:ring-foreground/40 transition cursor-pointer'
                >
                  {isSubmitting && <Loader2 className='w-4 h-4 animate-spin' />}
                  <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
                </button>
              </form>

            </motion.div>
            <motion.div className='fixed inset-0 bg-black/55 backdrop-blur-sm z-0' aria-hidden='true' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}