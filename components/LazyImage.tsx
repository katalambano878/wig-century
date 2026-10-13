'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';

const VIDEO_EXTENSIONS = ['.mov', '.mp4', '.webm', '.avi', '.m4v', '.ogg'];

// Phones share a small pipe. Let two on-screen videos buffer their first
// frame, then start the next. Desktop starts every visible video at once.
const MOBILE_PARALLEL_STARTS = 2;
const mobileWaiters: Array<() => void> = [];
let mobileActiveStarts = 0;

function isMobileViewport() {
  return window.matchMedia('(max-width: 767px)').matches;
}

function scheduleVideoStart(task: (releaseSlot: () => void) => void): () => void {
  if (!isMobileViewport()) {
    task(() => {});
    return () => {};
  }

  let started = false;
  let released = false;
  const releaseSlot = () => {
    if (!started || released) return;
    released = true;
    mobileActiveStarts = Math.max(0, mobileActiveStarts - 1);
    const next = mobileWaiters.shift();
    next?.();
  };
  const run = () => {
    started = true;
    mobileActiveStarts += 1;
    task(releaseSlot);
  };

  if (mobileActiveStarts < MOBILE_PARALLEL_STARTS) run();
  else mobileWaiters.push(run);

  return () => {
    const queuedAt = mobileWaiters.indexOf(run);
    if (queuedAt >= 0) {
      mobileWaiters.splice(queuedAt, 1);
      return;
    }
    releaseSlot();
  };
}

export function isVideoUrl(url: string): boolean {
  if (!url) return false;
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return VIDEO_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  } catch {
    return VIDEO_EXTENSIONS.some((ext) => url.toLowerCase().endsWith(ext));
  }
}

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  onLoad?: () => void;
  sizes?: string;
  /** Show native video controls on hover/focus (storefront product hero usage) */
  videoControls?: boolean;
  /** Override autoplay (defaults to true for muted loop video). */
  autoPlay?: boolean;
}

export default function LazyImage({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  onLoad,
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
  videoControls = false,
  autoPlay = true,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [inView, setInView] = useState(false);
  const [autoplayFailed, setAutoplayFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const isVideo = src ? isVideoUrl(src) : false;

  // Mount a video once it is near the screen. Keep watching so off-screen
  // videos can pause instead of downloading in the background.
  useEffect(() => {
    if (!isVideo || !containerRef.current) return;
    if (priority) setShouldLoad(true);
    const mobile = window.matchMedia('(max-width: 767px)').matches;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShouldLoad(true);
        setInView(entry.isIntersecting);
      },
      { rootMargin: mobile ? '40px' : '240px', threshold: mobile ? 0.2 : 0.01 },
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isVideo, priority]);

  // Mobile Safari will not fetch the picture until play() is called, and it
  // will not fire canplay while preload is only metadata. Start playback as
  // soon as the card is on screen.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;
    if (!inView || !autoPlay) {
      video.pause();
      return;
    }

    const show = () => setIsLoaded(true);
    video.addEventListener('loadeddata', show);
    video.addEventListener('playing', show);

    let releaseFirstFrame = () => {};
    const cancel = scheduleVideoStart((releaseSlot) => {
      releaseFirstFrame = releaseSlot;
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', 'true');
      video.preload = 'auto';
      video.addEventListener('loadeddata', releaseSlot);
      video.addEventListener('playing', releaseSlot);
      video.addEventListener('error', releaseSlot);
      const pending = video.play();
      if (pending) {
        pending.catch(() => {
          setAutoplayFailed(true);
          setIsLoaded(true);
          releaseSlot();
        });
      }
    });

    return () => {
      cancel();
      releaseFirstFrame();
      video.removeEventListener('loadeddata', show);
      video.removeEventListener('playing', show);
      video.removeEventListener('loadeddata', releaseFirstFrame);
      video.removeEventListener('playing', releaseFirstFrame);
      video.removeEventListener('error', releaseFirstFrame);
      video.pause();
    };
  }, [shouldLoad, inView, src, autoPlay]);

  const handleTapPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().then(() => setAutoplayFailed(false)).catch(() => {});
  }, []);

  if (!src || (hasError && !isVideo)) {
    return (
      <div
        className={`relative overflow-hidden bg-gray-200 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-gray-400 text-xs">No Image</span>
      </div>
    );
  }

  if (hasError && isVideo) {
    return (
      <div
        className={`relative overflow-hidden bg-gray-100 flex flex-col items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <i className="ri-video-off-line text-3xl text-gray-400 mb-1"></i>
        <span className="text-gray-400 text-[10px]">Video unavailable</span>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${className}`}
        style={{ width, height }}
      >
        {!isLoaded && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse z-10"></div>
        )}
        {shouldLoad && (
          <video
            ref={videoRef}
            src={src}
            muted
            autoPlay={autoPlay}
            loop
            playsInline
            controls={videoControls}
            preload="none"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoadedData={handleLoad}
            onError={handleError}
          />
        )}
        {autoplayFailed && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleTapPlay();
            }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/20"
            aria-label="Play video"
          >
            <span className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
              <i className="ri-play-fill text-slate-900 text-2xl"></i>
            </span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse z-10"></div>
      )}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className={`object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleLoad}
        onError={handleError}
        priority={priority}
        quality={75}
      />
    </div>
  );
}
