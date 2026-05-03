import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Tab } from "../ui/Auth";

export default function SignUpFormComponent(
  { setIsAuthVisible, switchTab, error, setError }: 
  { setIsAuthVisible: (value: boolean) => void, switchTab: (value: Tab) => void, error: string | null, setError: (value: string | null) => void }
) {
  const [signUpFormData, setSignUpFormData] = useState({ username: '', email: '', password: '', confirm_password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateSignUp = () => {
    if (!signUpFormData.username.trim()) return 'Username is required';
    if (!signUpFormData.email.trim()) return 'Email is required';
    if (!signUpFormData.password) return 'Password is required';
    if (!signUpFormData.confirm_password || signUpFormData.password !== signUpFormData.confirm_password) return 'Both passwords must match';
    return null;
  }

  const signUpUser = async (data: FormData) => {
    const validation = validateSignUp();
    if (validation) { setError(validation); return; }
    setError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        username: signUpFormData.username.trim(),
        email: signUpFormData.email.trim(),
        password: signUpFormData.password,
      };

      const res = await fetch('/api/auth/sign_up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important: Send/receive cookies
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        // Check for specific error codes
        if (data.code === 2001) return setError('Username is already taken');
        if (data.code === 2002) return setError('Email is already taken');
        if (data.code === 2003) return setError('Passwords don\'t correspond');
        
        // Handle password validation errors
        if (data.details && Array.isArray(data.details)) {
          return setError(data.details.join('. '));
        }
        
        // Fallback error message
        return setError(data?.message || data?.error || 'Sign up failed');
      }
      
      setIsAuthVisible(false);
    } catch (error) {
      console.error(error);
      setError('Sign up failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const usernameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmPasswordRef = useRef<HTMLInputElement | null>(null);
  const submitBtnRef = useRef<HTMLButtonElement | null>(null);

  // Focus first field on mount
  useEffect(() => { usernameRef.current?.focus(); }, []);

  const inputBase = 'p-2 border rounded-lg text-sm bg-background/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-foreground/40 transition shadow-sm border-border';

  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault();
        signUpUser(new FormData(e.currentTarget));
      }}
      className='flex flex-col gap-5 text-foreground'
    >
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
          value={signUpFormData.username}
          onChange={(e) => setSignUpFormData(p => ({ ...p, username: e.target.value }))}
          placeholder='johndoe'
          autoComplete='username'
          className={inputBase}
          disabled={isSubmitting}
          aria-required='true'
        />
      </div>
      <div className='flex flex-col gap-1'>
        <label className='text-xs font-medium' htmlFor='email'>Email</label>
        <input
          ref={emailRef}
          type='email'
          id='email'
          value={signUpFormData.email}
          onChange={(e) => setSignUpFormData(p => ({ ...p, email: e.target.value }))}
          placeholder='john@doe.com'
          autoComplete='email'
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
            value={signUpFormData.password}
            onChange={(e) => setSignUpFormData(p => ({ ...p, password: e.target.value }))}
            placeholder={showPassword ? "password" : "********"}
            autoComplete='new-password'
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
            value={signUpFormData.confirm_password}
            onChange={(e) => setSignUpFormData(p => ({ ...p, confirm_password: e.target.value }))}
            placeholder={showPassword ? "password" : "********"}
            autoComplete='new-password'
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
      <div className='flex items-center justify-between -mt-2'>
        <button
          ref={submitBtnRef}
          type='submit'
          disabled={isSubmitting}
          className='inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-foreground text-background text-sm font-medium hover:bg-gray-900 disabled:opacity-60 disabled:cursor-not-allowed shadow focus:outline-none focus:ring-2 focus:ring-foreground/40 transition cursor-pointer'
        >
          {isSubmitting && <Loader2 className='w-4 h-4 animate-spin' />}
          <span>{isSubmitting ? 'Signing up...' : 'Sign up'}</span>
        </button>
      </div>
      <div className='flex items-center gap-3 before:h-px before:flex-1 before:bg-border/70 after:h-px after:flex-1 after:bg-border/70'>
        <span className='text-[10px] tracking-wide text-muted-foreground'>OR</span>
      </div>
      <button
        type='button'
        className='group relative flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-border/70 bg-background/40 hover:bg-background/60 text-sm font-medium transition shadow focus:outline-none focus:ring-2 focus:ring-foreground/30 disabled:bg-gray-200 cursor-pointer disabled:cursor-default'
        onClick={() => switchTab("signin")}
        disabled={isSubmitting}
      >
        Log into account
        <span className='absolute right-3 opacity-60 group-hover:opacity-100 transition-transform group-hover:translate-x-0.5'><ChevronRight className='w-4 h-4' /></span>
      </button>
    </form>
  )
}