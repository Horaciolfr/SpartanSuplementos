import React from 'react';

interface PageLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export const PageLoader: React.FC<PageLoaderProps> = ({
  message = 'Preparando tu experiencia Spartan',
  fullScreen = true,
}) => (
  <div
    className={`${fullScreen ? 'min-h-screen' : 'min-h-[45vh]'} flex w-full items-center justify-center bg-[#080808] px-6`}
    role="status"
    aria-live="polite"
  >
    <div className="flex max-w-sm flex-col items-center text-center">
      <div className="relative mb-5 h-10 w-10" aria-hidden="true">
        <div className="absolute inset-0 rounded-full border border-white/15" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#e8dc00]" />
      </div>
      <p className="text-sm font-semibold text-white">{message}</p>
      <p className="mt-1 text-xs text-[#a8a596]">Esto solo tomará un momento.</p>
    </div>
  </div>
);
