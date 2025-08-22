"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

import { GooeyEffect } from "@/components/effects/GooeyEffect";
import { Waves } from "@/components/ui/WavesBackground";
import { BaseUser } from "@/types/users";

export default function ProfilePage() {
  const [user, setUser] = useState<BaseUser | null>(null);
  const router = useRouter();

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
        throw new Error(`Failed to fetch user: ${res.status} ${res.statusText}`);
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
          <header />
          <main className="flex flex-col gap-2 justify-center items-center grow py-4 px-4 lg:px-0">
            {!user && <p className="text-sm text-gray-400">Checking access…</p>}
          </main>
        </div>
      </div>
    </>
  );
}
