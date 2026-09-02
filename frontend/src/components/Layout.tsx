import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#e2e2e2] flex flex-col font-['Hanken_Grotesk'] selection:bg-[#f2e500] selection:text-black">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-[1280px] px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
};
