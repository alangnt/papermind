"use client";

import { useState, useEffect, useCallback, FormEvent, useRef, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import { Loader2, ChevronRight, Home, ArrowRight, EyeOff, Eye } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';

import DocumentCard from '@/components/cards/DocumentCard';
import { GooeyEffect } from "@/components/effects/GooeyEffect";
import { Waves } from "@/components/ui/WavesBackground";

import { BaseUser } from "@/types/users";
import { Document } from "@/types/documents";

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [user, setUser] = useState<BaseUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | null>(null);

  const [currentTab, setCurrentTab] = useState<"fullname" | "password">("fullname");
  const [showPassword, setShowPassword] = useState(false);

  const [fullNameFormData, setFullNameFormData] = useState({ firstName: "", lastName: "" });
  const [passwordFormData, setPasswordFormData] = useState({ oldPassword: "", newPassword: "", confirmNewPassword: "" });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const firstNameRef = useRef<HTMLInputElement | null>(null);
  const lastNameRef = useRef<HTMLInputElement | null>(null);
  const oldPasswordRef = useRef<HTMLInputElement | null>(null);
  const newPasswordRef = useRef<HTMLInputElement | null>(null);
  const confirmNewPasswordRef = useRef<HTMLInputElement | null>(null);
  const submitBtnRef = useRef<HTMLButtonElement | null>(null);

  const validateNewPassword = () => {
    if (passwordFormData.newPassword !== passwordFormData.confirmNewPassword) return "Both passwords must match"
    return null;
  };

  const editProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    if (!fullNameFormData.firstName.trim() && !fullNameFormData.lastName.trim()) {
      setIsSubmitting(false);
      return;
    }

    try {
      const body = {
        username: user?.name,
        firstName: fullNameFormData.firstName.trim(),
        lastName: fullNameFormData.lastName.trim()
      }

      const res = await fetch('/api/users/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) return setError("Failed to update the user");

      const data = await res.json();

      if (data) {
        setFullNameFormData({
          firstName: data.data.firstName,
          lastName: data.data.lastName
        });

        setError(null);
        return setValidation("Name changed successfully");
      }
    } catch (error) {
      console.error(error);
      setError("Failed to update the user");
    } finally {
      setIsSubmitting(false);
      router.refresh();
    }
  }

  const submitNewPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError(null);
    setValidation(null);
    setIsSubmitting(true);

    const validate = validateNewPassword();
    if (validate) return setError(validate);

    try {
      const res = await fetch('/api/auth/edit_password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(passwordFormData)
      });

      if (!res.ok) {
        if (res.status === 400) return setError("Your old password is incorrect");
        if (res.status === 401) return setError("Some data are missing");
        if (res.status === 409) return setError("Both passwords must match");
        if (res.status === 500) return setError("Failed to update the password");
      }

      const data = await res.json();

      if (data.status === 400) return setError("Your old password is incorrect");

      setError(null);
      setPasswordFormData({
        oldPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      })
      setShowPassword(false);
      return setValidation("Password changed successfully");
    } catch (error) {
      console.error(error);
      return setError("Failed to update the password");
    } finally {
      setIsSubmitting(false);
    }
  }

  const switchTab = (tab: "fullname" | "password") => {
    // Reset Forms
    setFullNameFormData({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
    });
    setPasswordFormData({
      oldPassword: "",
      newPassword: "",
      confirmNewPassword: ""
    });

    setError(null);
    setValidation(null);
    setCurrentTab(tab);
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const focusableRefs = currentTab === "fullname" ? [firstNameRef, lastNameRef, submitBtnRef] : [oldPasswordRef, newPasswordRef, confirmNewPasswordRef, submitBtnRef];
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
  }, [firstNameRef, lastNameRef, oldPasswordRef, newPasswordRef, confirmNewPasswordRef, submitBtnRef, currentTab]);

  useEffect(() => {
    if (user) {
      setFullNameFormData(prev => {
        const userFirst = user.firstName || "";
        const userLast = user.lastName || "";
        if (prev.firstName !== "" || prev.lastName !== "") return prev;
        return { firstName: userFirst, lastName: userLast };
      });
    }
  }, [user]);

  const inputBase = 'p-2 border rounded-lg text-sm text-foreground bg-background backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-foreground/40 transition shadow-sm border-border';

  useEffect(() => {
    if (session?.user) {
      console.log(session?.user);
      setUser(session.user as unknown as BaseUser);
    } else {
      router.push("/");
    }
  }, [session]);

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

        <div className="flex flex-col gap-y-2 grow w-full max-w-3xl place-self-center text-gray-300 min-h-screen z-40">
          <main className="flex flex-col gap-2 items-center grow py-4 px-4 lg:px-0 overflow-hidden">
            {!session?.user ? (
              <p className="text-sm text-gray-400">Checking access…</p>
            ) : (
              <>
                <motion.button
                  className="relative text-background bg-foreground z-80 flex items-center justify-center rounded-full cursor-pointer transition overflow-visible focus:outline-none p-2 w-fit place-self-center"
                  aria-label="User profile"
                  initial="rest"
                  animate="rest"
                  whileHover="hover"
                  variants={{
                    rest: { paddingRight: '0.5rem' },
                    hover: {
                      paddingRight: '1.75rem',
                      transition: { type: 'spring', stiffness: 260, damping: 20 },
                    },
                  }}
                >
                  <Link href={'/'}>
                    <Home className="w-4 h-4" />
                    <motion.span
                      className="absolute top-1/2 -translate-y-1/2 right-1 flex items-center justify-center p-2"
                      variants={{
                        rest: { opacity: 0, x: 6, scale: 0.6 },
                        hover: {
                          opacity: 1,
                          x: 0,
                          scale: 1,
                          transition: { type: 'spring', stiffness: 300, damping: 18 },
                        },
                      }}
                    >
                      <ArrowRight className="w-3 h-3" />
                    </motion.span>
                  </Link>
                </motion.button>

                <AnimatePresence>
                  <motion.div className='z-110 flex items-center justify-center' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
                    <motion.div
                      ref={containerRef}
                      role='dialog'
                      aria-modal='true'
                      aria-labelledby='login-title'
                      onKeyDown={handleKeyDown}
                      className={' z-10'}
                      initial={{ y: 28, opacity: 0, scale: 0.94 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      exit={{ y: 16, opacity: 0, scale: 0.97 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }}
                      layout
                    >
                      <div className={'grid grid-cols-1 md:grid-cols-5 justify-center gap-2'}>
                        {/* Profile Info */}
                        <div className="flex flex-col gap-4 rounded-lg bg-foreground text-background z-80 p-6 h-fit col-span-1 md:col-span-2">
                          <h1>
                            Welcome,{' '}
                            {user?.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user?.name}
                          </h1>

                          <AnimatePresence mode="wait">
                            <motion.div
                              key={currentTab}
                              initial={{ opacity: 0, y: 8, scale: 0.995 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -8, scale: 0.995 }}
                              transition={{ duration: 0.18, ease: 'easeOut' }}
                              className="flex flex-col gap-5 text-background"
                            >
                              {/* Edit full name */}
                              {currentTab === "fullname" && (
                                <form className="flex flex-col gap-5 text-background" onSubmit={editProfile}>
                                  {error && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -6 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -4 }}
                                      className="text-red-500 text-xs bg-red-500/10 border border-red-500/30 px-3 py-2 rounded-md"
                                      role="alert"
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

                                  <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium" htmlFor="firstName">
                                      First Name
                                    </label>
                                    <input
                                      ref={firstNameRef}
                                      type="text"
                                      id="firstName"
                                      value={fullNameFormData.firstName}
                                      onChange={(e) =>
                                        setFullNameFormData((p) => ({ ...p, firstName: e.target.value }))
                                      }
                                      placeholder="John"
                                      autoComplete="firstName"
                                      className={inputBase}
                                      disabled={isSubmitting}
                                      aria-required="true"
                                    />
                                  </div>

                                  <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium" htmlFor="lastName">
                                      Last Name
                                    </label>
                                    <input
                                      ref={lastNameRef}
                                      type="text"
                                      id="lastName"
                                      value={fullNameFormData.lastName}
                                      onChange={(e) =>
                                        setFullNameFormData((p) => ({ ...p, lastName: e.target.value }))
                                      }
                                      placeholder="Doe"
                                      autoComplete="lastName"
                                      className={inputBase}
                                      disabled={isSubmitting}
                                      aria-required="true"
                                    />
                                  </div>

                                  <button
                                    ref={submitBtnRef}
                                    type="submit"
                                    disabled={
                                      isSubmitting ||
                                      (!fullNameFormData.firstName && !fullNameFormData.lastName) ||
                                      (fullNameFormData.firstName === user?.firstName &&
                                        fullNameFormData.lastName === user?.lastName)
                                    }
                                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-background text-foreground text-sm font-medium hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed shadow focus:outline-none focus:ring-2 focus:ring-background/40 transition cursor-pointer"
                                  >
                                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
                                  </button>
                                  <div className="flex items-center gap-3 before:h-px before:flex-1 before:bg-border/70 after:h-px after:flex-1 after:bg-border/70">
                                    <span className="text-[10px] tracking-wide text-muted-foreground">OR</span>
                                  </div>
                                  <button
                                    type="button"
                                    className="group relative flex items-center justify-center gap-2 pl-3 pr-9 py-2 rounded-md border border-border/30 bg-foreground/40 hover:bg-foreground/60 text-sm font-medium transition shadow focus:outline-none focus:ring-2 focus:ring-background/30 disabled:bg-gray-700 cursor-pointer disabled:cursor-default"
                                    disabled={isSubmitting}
                                    onClick={() => switchTab("password")}
                                  >
                                    Change my password
                                    <span className="absolute right-3 opacity-60 group-hover:opacity-100 transition-transform group-hover:translate-x-0.5">
                                      <ChevronRight className="w-4 h-4" />
                                    </span>
                                  </button>
                                </form>
                              )}

                              {/* Edit password */}
                              {currentTab === "password" && (
                                <form className="flex flex-col gap-5 text-background" onSubmit={submitNewPassword}>
                                  {error && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -6 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -4 }}
                                      className="text-red-500 text-xs bg-red-500/10 border border-red-500/30 px-3 py-2 rounded-md"
                                      role="alert"
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

                                  <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium" htmlFor="oldPassword">
                                      Old Password
                                    </label>
                                    <div className='relative'>
                                      <input
                                        ref={oldPasswordRef}
                                        type={showPassword ? 'text' : 'password'}
                                        id='oldPassword'
                                        value={passwordFormData.oldPassword}
                                        onChange={(e) => setPasswordFormData(p => ({ ...p, oldPassword: e.target.value }))}
                                        placeholder={showPassword ? "password" : "********"}
                                        autoComplete='oldPassword'
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

                                  <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium" htmlFor="newPassword">
                                      New Password
                                    </label>
                                    <div className='relative'>
                                      <input
                                        ref={newPasswordRef}
                                        type={showPassword ? 'text' : 'password'}
                                        id='newPassword'
                                        value={passwordFormData.newPassword}
                                        onChange={(e) => setPasswordFormData(p => ({ ...p, newPassword: e.target.value }))}
                                        placeholder={showPassword ? "password" : "********"}
                                        autoComplete='newPassword'
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

                                  <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium" htmlFor="confirmNewPassword">
                                      Confirm New Password
                                    </label>
                                    <div className='relative'>
                                      <input
                                        ref={confirmNewPasswordRef}
                                        type={showPassword ? 'text' : 'password'}
                                        id='confirmNewPassword'
                                        value={passwordFormData.confirmNewPassword}
                                        onChange={(e) => setPasswordFormData(p => ({ ...p, confirmNewPassword: e.target.value }))}
                                        placeholder={showPassword ? "password" : "********"}
                                        autoComplete='confirmNewPassword'
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
                                    type="submit"
                                    disabled={isSubmitting || !passwordFormData.oldPassword || !passwordFormData.newPassword || !passwordFormData.confirmNewPassword}
                                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-background text-foreground text-sm font-medium hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed shadow focus:outline-none focus:ring-2 focus:ring-background/40 transition cursor-pointer"
                                  >
                                    {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
                                  </button>
                                  <div className="flex items-center gap-3 before:h-px before:flex-1 before:bg-border/70 after:h-px after:flex-1 after:bg-border/70">
                                    <span className="text-[10px] tracking-wide text-muted-foreground">OR</span>
                                  </div>
                                  <button
                                    type="button"
                                    className="group relative flex items-center justify-center gap-2 pl-3 pr-9 py-2 rounded-md border border-border/30 bg-foreground/40 hover:bg-foreground/60 text-sm font-medium transition shadow focus:outline-none focus:ring-2 focus:ring-background/30 disabled:bg-gray-700 cursor-pointer disabled:cursor-default"
                                    disabled={isSubmitting}
                                    onClick={() => switchTab("fullname")}
                                  >
                                    Edit my full name
                                    <span className="absolute right-3 opacity-60 group-hover:opacity-100 transition-transform group-hover:translate-x-0.5">
                                      <ChevronRight className="w-4 h-4" />
                                    </span>
                                  </button>
                                </form>
                              )}
                            </motion.div>
                          </AnimatePresence>
                        </div>

                        {/* Saved Articles */}
                        <div className="flex flex-col gap-4 rounded-lg bg-foreground text-background z-80 p-6 h-fit md:max-h-[90vh] overflow-y-auto col-span-1 md:col-span-3">
                          <h2>Saved Articles</h2>

                          {user?.savedArticles &&
                            user.savedArticles.map((document: Document) => (
                              <DocumentCard
                                key={document.id}
                                document={document}
                                username={user.name ?? undefined}
                                isSaved={!!user?.savedArticles?.find((article) => article.id === document.id)}
                              />
                            ))}
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                </AnimatePresence>
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
