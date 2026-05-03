import { useRef, useState, FormEvent } from "react";
import { motion } from "motion/react";
import { ChevronRight, Loader2 } from "lucide-react";
import { Tab } from "../ui/Auth";

export default function ResetPasswordFormComponent(
  { switchTab, error, setError }: 
  { switchTab: (value: Tab) => void, error: string | null, setError: (value: string | null) => void }
) {
  const [resetPasswordFormData, setResetPasswordFormData] = useState({ email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);

  const resetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError(null);
    setValidation(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/send_reset_password_link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetPasswordFormData),
      });

      return await res.json();
    } catch (error) {
      console.error(error);
    } finally {
      setValidation("Email sent. Don't forget to also check your spams");
      setIsSubmitting(false);
    }
  }

  const emailRef = useRef<HTMLInputElement | null>(null);
  const submitBtnRef = useRef<HTMLButtonElement | null>(null);

  const inputBase = 'p-2 border rounded-lg text-sm bg-background/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-foreground/40 transition shadow-sm border-border';

  return (
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
        <label className='text-xs font-medium' htmlFor='email'>Email</label>
        <input
          ref={emailRef}
          type='email'
          id='email'
          value={resetPasswordFormData.email}
          onChange={(e) => setResetPasswordFormData(p => ({ ...p, email: e.target.value }))}
          placeholder='john@doe.com'
          autoComplete='email'
          className={inputBase}
          disabled={isSubmitting}
          aria-required='true'
        />
      </div>
      <div className='flex items-center justify-between -mt-2'>
        <button
          ref={submitBtnRef}
          type='submit'
          disabled={isSubmitting}
          className='inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-foreground text-background text-sm font-medium hover:bg-gray-900 disabled:opacity-60 disabled:cursor-not-allowed shadow focus:outline-none focus:ring-2 focus:ring-foreground/40 transition cursor-pointer'
        >
          {isSubmitting && <Loader2 className='w-4 h-4 animate-spin' />}
          <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
        </button>
      </div>
      <div className='flex items-center gap-3 before:h-px before:flex-1 before:bg-border/70 after:h-px after:flex-1 after:bg-border/70'>
        <span className='text-[10px] tracking-wide text-muted-foreground'>OR</span>
      </div>
      <button
        type='button'
        className='group relative flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-border/70 bg-background/40 hover:bg-background/60 text-sm font-medium transition shadow focus:outline-none focus:ring-2 focus:ring-foreground/30 disabled:bg-gray-200 cursor-pointer disabled:cursor-default'
        onClick={() => {
          setValidation(null);
          switchTab("signin");
        }}
        disabled={isSubmitting}
      >
        Log into account
        <span className='absolute right-3 opacity-60 group-hover:opacity-100 transition-transform group-hover:translate-x-0.5'><ChevronRight className='w-4 h-4' /></span>
      </button>
    </form>
  )
}