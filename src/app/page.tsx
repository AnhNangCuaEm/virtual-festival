'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRef, useEffect, useCallback, MutableRefObject } from 'react';

export default function Home() {
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  const backAudioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = (ref: MutableRefObject<HTMLAudioElement | null>, src: string, volume = 0.6) => {
    if (!ref.current) {
      ref.current = new Audio(src);
      ref.current.volume = volume;
    }

    ref.current.currentTime = 0;
    ref.current.play().catch((error) => {
      console.warn('Audio playback failed:', error);
    });
  };

  const playClickSound = useCallback(
    () => playAudio(clickAudioRef, '/sounds/click.wav'),
    []
  );
  const playBackSound = useCallback(
    () => playAudio(backAudioRef, '/sounds/back.wav', 0.5),
    []
  );

  const handleNavigationClick = () => {
    playClickSound();
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handlePopState = () => {
        playBackSound();
      };
      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        if (clickAudioRef.current) {
          clickAudioRef.current.pause();
          clickAudioRef.current = null;
        }
        if (backAudioRef.current) {
          backAudioRef.current.pause();
          backAudioRef.current = null;
        }
      };
    }

    return () => {
      if (clickAudioRef.current) {
        clickAudioRef.current.pause();
        clickAudioRef.current = null;
      }
      if (backAudioRef.current) {
        backAudioRef.current.pause();
        backAudioRef.current = null;
      }
    };
  }, [playBackSound]);

  return (
    <div className="min-h-screen flex flex-col bg-[url('/background/background.jpg')] bg-cover bg-center">
      <main className="container flex flex-col justify-center mx-auto px-4 py-8 flex-1">
        <div className="flex justify-between items-center">
          <div className='flex flex-col items-center'>
            <Image
              src="/logo.svg"
              alt="Virtual Festival Logo"
              width={500}
              height={100}
              className='mb-8'
            />
            <p className='font-semibold text-white text-3xl text-center text-shadow'>ひとつの出会いが、心を通わせる物語になる。</p>
          </div>
          <div>
            <div className="flex justify-center gap-10 mt-12">
              <Link
                href="/dashboard"
                onClick={handleNavigationClick}
                className="block mt-8 text-center text-2xl bg-white text-gray-800 px-6 py-3 rounded-lg shadow-md hover:bg-blue-100 hover:shadow-lg"
              >
                Dashboard
              </Link>
              <Link
                href="/qrpage"
                onClick={handleNavigationClick}
                className="block mt-8 text-center text-2xl bg-white text-gray-800 px-6 py-3 rounded-lg shadow-md hover:bg-blue-100 hover:shadow-lg"
              >
                QR Page
              </Link>
              <Link
                href="/venue"
                onClick={handleNavigationClick}
                className="block mt-8 text-center text-2xl bg-white text-gray-800 px-6 py-3 rounded-lg shadow-md hover:bg-blue-100 hover:shadow-lg"
              >
                Venue
              </Link>
            </div>
          </div>
        </div>

      </main>
      <footer className="text-center mb-2">
        <p>Virtual Festival. &copy; {new Date().getFullYear()} All rights reserved.</p>
      </footer>
    </div>
  );
}
