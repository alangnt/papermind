import { useState, FormEvent, useRef } from 'react';
import { X, ChevronRight } from 'lucide-react';
import { useClickOutside } from '@/hooks/useClickOutside';

export default function LoginComponent({ onLoggedIn, setIsLoginVisible }: { onLoggedIn?: () => void, setIsLoginVisible: (arg0: boolean) => void }) {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  useClickOutside(containerRef, () => setIsLoginVisible(false));

  const valueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  }

  const loginUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const body = new URLSearchParams();
      body.set("username", formData.username);
      body.set("password", formData.password);
      body.set("grant_type", "password");

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`${res.status} ${res.statusText}: ${err.detail ?? "Login failed"}`);
      }

      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      onLoggedIn?.();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className='flex items-center justify-center w-full h-full'>      
      <div ref={containerRef} className='flex flex-col gap-4 bg-background p-6 rounded-lg border border-gray-500 relative m-6'>
        <button className='absolute top-4 right-4 text-gray-600 cursor-pointer' onClick={() => setIsLoginVisible(false)}><X className='w-5 h-5' /></button>

        <div className='flex flex-col items-center justify-between text-foreground mb-4'>
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border"
            aria-hidden="true"
          >
            <svg
              className="stroke-zinc-800 dark:stroke-zinc-100"
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 32 32"
              aria-hidden="true"
            >
              <circle cx="16" cy="16" r="12" fill="none" strokeWidth="8" />
            </svg>
          </div>
          <p className="sm:text-center text-lg">Welcome back</p>
          <p className="sm:text-center text-sm text-gray-500">
            Enter your credentials to login to your account.
          </p>
        </div>
      
        <form onSubmit={(e) => loginUser(e)} className='flex flex-col gap-6 text-foreground'>
          <div className="flex flex-col justify-center gap-1">
            <label className='text-sm' htmlFor="username">Username</label>
            <input 
              type="text" 
              id="username" 
              value={formData.username} 
              onChange={valueChange}
              placeholder="johndoe"
              className="p-2 border border-gray-200 rounded-lg text-foreground text-sm" 
            />
          </div>
      
          <div className="flex flex-col justify-center gap-1">
            <label className='text-sm' htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              value={formData.password} 
              onChange={valueChange}
              placeholder="Enter your password"
              className="p-2 border border-gray-200 rounded-lg text-foreground text-sm" 
            />
          </div>

          <div>
            
          </div>

          <button type="submit" className="p-2 rounded-lg bg-foreground text-background hover:bg-gray-900 transition cursor-pointer text-sm">Sign in</button>

          <div className="flex items-center gap-3 before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
            <span className="text-xs text-muted-foreground">OR</span>
          </div>

          <button className="flex items-center justify-center p-2 border border-gray-200 rounded-lg bg-background text-foreground hover:bg-gray-100 transition cursor-pointer text-sm relative">
            Create an account
            <span className='absolute right-2'><ChevronRight className='w-4 h-4' /></span>
          </button>
        </form>
      </div>
    </div>
  )
}