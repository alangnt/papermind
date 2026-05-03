import { useEffect, useRef, useState } from "react";
import { motion } from 'motion/react';
import { ChevronRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Tab } from "../ui/Auth";
import { SignInForm } from "@/types/auth";
import { useAuth } from "@/hooks/useAuth";

export default function SignInFormComponent(
  { setIsAuthVisible, switchTab }: 
  { setIsAuthVisible: (value: boolean) => void, switchTab: (value: Tab) => void }
) {
  const { handleSignIn, isLoading, errorMessage } = useAuth();

  const [signInFormData, setSignInFormData] = useState<SignInForm>({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const submitBtnRef = useRef<HTMLButtonElement | null>(null);

  // Focus first field on mount
  useEffect(() => { emailRef.current?.focus(); }, []);

  const inputBase = 'p-2 border rounded-lg text-sm bg-background/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-foreground/40 transition shadow-sm border-border';

  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault();
        handleSignIn(new FormData(e.currentTarget));
      }} 
      className='flex flex-col gap-5 text-foreground'
    >
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className='text-red-500 text-xs bg-red-500/10 border border-red-500/30 px-3 py-2 rounded-md'
          role='alert'
        >
          {errorMessage}
        </motion.div>
      )}

      <div className='flex flex-col gap-1'>
        <label className='text-xs font-medium' htmlFor='email'>Email</label>
        <input
          ref={emailRef}
          type='email'
          id='email'
          value={signInFormData.email}
          onChange={(e) => setSignInFormData(p => ({ ...p, email: e.target.value }))}
          placeholder='johndoe'
          autoComplete='email'
          className={inputBase}
          disabled={isLoading}
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
            value={signInFormData.password}
            onChange={(e) => setSignInFormData(p => ({ ...p, password: e.target.value }))}
            placeholder={showPassword ? "password" : "********"}
            autoComplete='current-password'
            className={inputBase + ' w-full pr-8'}
            disabled={isLoading}
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
          disabled={isLoading}
          className='inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-foreground text-background text-sm font-medium hover:bg-gray-900 disabled:opacity-60 disabled:cursor-not-allowed shadow focus:outline-none focus:ring-2 focus:ring-foreground/40 transition cursor-pointer'
        >
          {isLoading && <Loader2 className='w-4 h-4 animate-spin' />}
          <span>{isLoading ? 'Signing in...' : 'Sign in'}</span>
        </button>
        <button
          type='button'
          className='text-xs text-gray-500 hover:text-foreground transition underline-offset-2 hover:underline'
          onClick={() => switchTab("reset_password")}
        >
          Forgot password?
        </button>
      </div>

      <div className='flex items-center gap-3 before:h-px before:flex-1 before:bg-border/70 after:h-px after:flex-1 after:bg-border/70'>
        <span className='text-[10px] tracking-wide text-muted-foreground'>OR</span>
      </div>

      <button
        type='button'
        className='group relative flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-border/70 bg-background/40 hover:bg-background/60 text-sm font-medium transition shadow focus:outline-none focus:ring-2 focus:ring-foreground/30 disabled:bg-gray-200 cursor-pointer disabled:cursor-default'
        onClick={() => switchTab("signup")}
        disabled={isLoading}
      >
        Create an account
        <span className='absolute right-3 opacity-60 group-hover:opacity-100 transition-transform group-hover:translate-x-0.5'><ChevronRight className='w-4 h-4' /></span>
      </button>
    </form>
  )
}