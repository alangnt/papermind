"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { useRouter } from 'next/navigation';
import { Loader2, ChevronRight, Home, ArrowRight } from 'lucide-react';
import { motion } from "motion/react";
import Link from 'next/link';

import { GooeyEffect } from "@/components/effects/GooeyEffect";
import { Waves } from "@/components/ui/WavesBackground";
import { BaseUser } from "@/types/users";

export default function ProfilePage() {
  const [user, setUser] = useState<BaseUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState({ first_name: "", last_name: "" });

  const editProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    if (!formData.first_name.trim() && !formData.last_name.trim()) {
      setIsSubmitting(false);
      return;
    }

    try {
      const body = {
        username: user?.username,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim()
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/edit/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!res.ok) {
        setError("Failed to update the user");
      }

      const data = await res.json();

      if (data) {
        setFormData({
          first_name: data.data.first_name,
          last_name: data.data.last_name
        });
      }
    } catch (error) {
      console.error(error);
      setError("Failed to update the user");
    } finally {
      setIsSubmitting(false);
    }
  }

  const getUserAccess = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

    if (!token) {
      setUser(null);
      router.replace("/");
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me/`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem("access_token");
        setUser(null);
        router.replace("/");
        return;
      }

      if (!res.ok) {
        console.error(`Failed to fetch user: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error(err);
      setUser(null);
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    getUserAccess();
  }, [getUserAccess]);

  useEffect(() => {
    if (user) {
      setFormData(prev => {
        const userFirst = user.first_name || "";
        const userLast = user.last_name || "";
        if (prev.first_name !== "" || prev.last_name !== "") return prev;
        return { first_name: userFirst, last_name: userLast };
      });
    }
  }, [user]);

  useEffect(() => {
    console.log(formData.first_name, user?.first_name);
    console.log(formData.last_name, user?.last_name);
  }, [formData.first_name, user?.first_name, formData.last_name, user?.last_name]);

  const inputBase = 'p-2 border rounded-lg text-sm text-foreground bg-background/70 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-foreground/40 transition shadow-sm border-border';

  return (
    <>
      <div className="relative w-full overflow-hidden">
        <GooeyEffect />
        <div className="absolute inset-0 w-full pointer-events-none">
          <Waves
            lineColor="rgba(0, 0, 0, 0.3)"
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
          <main className="flex flex-col gap-2 justify-center items-center grow py-4 px-4 lg:px-0">
            {!user ? <p className="text-sm text-gray-400">Checking access…</p> : (
              <>
                <motion.button
                  className='relative text-background bg-foreground/80 z-80 flex items-center justify-center rounded-full cursor-pointer transition overflow-visible focus:outline-none p-2'
                  aria-label='User profile'
                  initial='rest'
                  animate='rest'
                  whileHover='hover'
                  variants={{
                    rest: { paddingRight: '0.5rem' },
                    hover: { paddingRight: '1.75rem', transition: { type: 'spring', stiffness: 260, damping: 20 } }
                  }}
                >
                  <Link href={"/"}>
                    <Home className='w-4 h-4' />
                    <motion.span
                      className='absolute top-1/2 -translate-y-1/2 right-1 flex items-center justify-center p-2'
                      variants={{
                        rest: { opacity: 0, x: 6, scale: 0.6 },
                        hover: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 18 } }
                      }}
                    >
                      <ArrowRight className='w-3 h-3' />
                    </motion.span>
                  </Link>
                </motion.button>

                {/* Profile Info */}
                <div className="flex flex-col gap-4 rounded-lg bg-foreground text-background z-80 p-6">
                  <p>Welcome, {(user.first_name && user.last_name) ? `${user.first_name} ${user.last_name}` : user.username}</p>

                  <form className='flex flex-col gap-5 text-background' onSubmit={editProfile}>
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
                      <label className='text-xs font-medium' htmlFor='first_name'>First Name</label>
                      <input
                        type='text'
                        id='first_name'
                        value={formData.first_name}
                        onChange={(e) => setFormData(p => ({ ...p, first_name: e.target.value }))}
                        placeholder='John'
                        autoComplete='first_name'
                        className={inputBase}
                        disabled={isSubmitting}
                        aria-required='true'
                      />
                    </div>

                    <div className='flex flex-col gap-1'>
                      <label className='text-xs font-medium' htmlFor='last_name'>Last Name</label>
                      <input
                        type='text'
                        id='last_name'
                        value={formData.last_name}
                        onChange={(e) => setFormData(p => ({ ...p, last_name: e.target.value }))}
                        placeholder='Doe'
                        autoComplete='last_name'
                        className={inputBase}
                        disabled={isSubmitting}
                        aria-required='true'
                      />
                    </div>

                    <button
                      type='submit'
                      disabled={isSubmitting || (formData.first_name === user.first_name && formData.last_name === user.last_name)}
                      className='inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-background text-foreground text-sm font-medium hover:bg-gray-200 disabled:opacity-60 shadow focus:outline-none focus:ring-2 focus:ring-background/40 transition disabled:bg-gray-50 cursor-pointer disabled:cursor-default'
                    >
                      {isSubmitting && <Loader2 className='w-4 h-4 animate-spin' />}
                      <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
                    </button>
                    <div className='flex items-center gap-3 before:h-px before:flex-1 before:bg-border/70 after:h-px after:flex-1 after:bg-border/70'>
                      <span className='text-[10px] tracking-wide text-muted-foreground'>OR</span>
                    </div>
                    <button
                      type='button'
                      className='group relative flex items-center justify-center gap-2 pl-3 pr-9 py-2 rounded-md border border-border/30 bg-foreground/40 hover:bg-foreground/60 text-sm font-medium transition shadow focus:outline-none focus:ring-2 focus:ring-background/30 disabled:bg-gray-700 cursor-pointer disabled:cursor-default'
                      disabled={isSubmitting}
                    >
                      Change my password
                      <span className='absolute right-3 opacity-60 group-hover:opacity-100 transition-transform group-hover:translate-x-0.5'><ChevronRight className='w-4 h-4' /></span>
                    </button>
                  </form>
                </div>

                {/* Saved Articles */}
                <div>

                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
