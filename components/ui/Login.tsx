import { useState, FormEvent, useRef, useEffect, useCallback } from 'react';
import { X, ChevronRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useClickOutside } from '@/hooks/useClickOutside';
import { motion, AnimatePresence } from 'motion/react';

export default function LoginComponent({ onLoggedIn, setIsLoginVisible }: { onLoggedIn?: () => void, setIsLoginVisible: (arg0: boolean) => void }) {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const usernameRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const submitBtnRef = useRef<HTMLButtonElement | null>(null);

  useClickOutside(containerRef, () => !isSubmitting && setIsLoginVisible(false));

  // Focus first field on mount
  useEffect(() => { usernameRef.current?.focus(); }, []);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!isSubmitting) setIsLoginVisible(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSubmitting, setIsLoginVisible]);

  // Simple focus trap
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const focusableRefs = [usernameRef, passwordRef, submitBtnRef];
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
  }, [usernameRef, passwordRef, submitBtnRef]);

  const validate = () => {
    if (!formData.username.trim()) return 'Username is required';
    if (!formData.password) return 'Password is required';
    return null;
  };

  const loginUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validation = validate();
    if (validation) { setError(validation); return; }
    setError(null);
    setIsSubmitting(true);
    try {
      const body = new URLSearchParams();
      body.set('username', formData.username.trim());
      body.set('password', formData.password);
      body.set('grant_type', 'password');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/token/`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Invalid credentials');
      }
      const data = await res.json();
      localStorage.setItem('access_token', data.access_token);
      onLoggedIn?.();
      setIsLoginVisible(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBase = 'p-2 border rounded-lg text-sm bg-background/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-foreground/40 transition shadow-sm border-border';
  const panelStyles = 'flex flex-col gap-4 bg-gradient-to-br from-background to-background/90 p-6 rounded-xl border border-border/60 relative m-6 shadow-2xl min-w-[320px] w-full max-w-sm';

  return (
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
          <button
            className='absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer rounded-md focus:outline-none focus:ring-2 focus:ring-foreground/40'
            onClick={() => setIsLoginVisible(false)}
            aria-label='Close login modal'
            disabled={isSubmitting}
          >
            <X className='w-5 h-5' />
          </button>

          <div className='flex flex-col items-center text-foreground mb-2 gap-2'>
            <div className='flex items-center justify-center rounded-full border border-border size-12 bg-background/40 backdrop-blur-sm shadow-inner'>
              <svg className='stroke-zinc-800 dark:stroke-zinc-100' xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 32 32' aria-hidden='true'>
                <circle cx='16' cy='16' r='12' fill='none' strokeWidth='6' />
              </svg>
            </div>
            <h2 id='login-title' className='text-lg font-medium'>Welcome back</h2>
            <p className='text-xs text-gray-500'>Authenticate to continue.</p>
          </div>

          <form onSubmit={loginUser} className='flex flex-col gap-5 text-foreground'>
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
            <div className='flex flex-col gap-1'>
              <label className='text-xs font-medium' htmlFor='username'>Username</label>
              <input
                ref={usernameRef}
                type='text'
                id='username'
                value={formData.username}
                onChange={(e) => setFormData(p => ({ ...p, username: e.target.value }))}
                placeholder='johndoe'
                autoComplete='username'
                className={inputBase}
                disabled={isSubmitting}
                aria-required='true'
              />
            </div>
            <div className='flex flex-col gap-1'>
              <label className='text-xs font-medium' htmlFor='password'>Password</label>
              <div className='relative'>
                <input
                  ref={passwordRef}
                  type={showPassword ? 'text' : 'password'}
                  id='password'
                  value={formData.password}
                  onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                  placeholder='••••••••'
                  autoComplete='current-password'
                  className={inputBase + ' pr-9'}
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
            <div className='flex items-center justify-between -mt-2'>
              <button
                ref={submitBtnRef}
                type='submit'
                disabled={isSubmitting}
                className='inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-foreground text-background text-sm font-medium hover:bg-gray-900 disabled:opacity-60 disabled:cursor-not-allowed shadow focus:outline-none focus:ring-2 focus:ring-foreground/40 transition'
              >
                {isSubmitting && <Loader2 className='w-4 h-4 animate-spin' />}
                <span>{isSubmitting ? 'Signing in...' : 'Sign in'}</span>
              </button>
              <button
                type='button'
                className='text-xs text-gray-500 hover:text-foreground transition underline-offset-2 hover:underline'
                onClick={() => {/* placeholder for forgot password */}}
              >
                Forgot password?
              </button>
            </div>
            <div className='flex items-center gap-3 before:h-px before:flex-1 before:bg-border/70 after:h-px after:flex-1 after:bg-border/70'>
              <span className='text-[10px] tracking-wide text-muted-foreground'>OR</span>
            </div>
            <button
              type='button'
              className='group relative flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-border/70 bg-background/40 hover:bg-background/60 text-sm font-medium transition shadow focus:outline-none focus:ring-2 focus:ring-foreground/30'
              onClick={() => {/* placeholder create account flow */}}
            >
              Create an account
              <span className='absolute right-3 opacity-60 group-hover:opacity-100 transition-transform group-hover:translate-x-0.5'><ChevronRight className='w-4 h-4' /></span>
            </button>
          </form>
        </motion.div>
        <motion.div className='fixed inset-0 bg-black/55 backdrop-blur-sm z-0' aria-hidden='true' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} onClick={() => !isSubmitting && setIsLoginVisible(false)} />
      </motion.div>
    </AnimatePresence>
  );
}