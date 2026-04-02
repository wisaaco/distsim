'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    href: '/',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
        <path d="M8.543 2.232a.75.75 0 00-1.085 0l-5.25 5.5A.75.75 0 002.75 9H4v4a1 1 0 001 1h2a1 1 0 001-1v-2h1v2a1 1 0 001 1h2a1 1 0 001-1V9h1.25a.75.75 0 00.543-1.268l-5.25-5.5z" />
      </svg>
    ),
  },
  {
    href: '/labs',
    label: 'Labs',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
        <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v2A1.5 1.5 0 0112.5 7h-9A1.5 1.5 0 012 5.5v-2zM3 4a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1A.5.5 0 013 4zm9.5-.5a.5.5 0 100 1 .5.5 0 000-1zM2 9a1.5 1.5 0 011.5-1.5h9A1.5 1.5 0 0114 9v2a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 11V9zm1 .5a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5zm9.5-.5a.5.5 0 100 1 .5.5 0 000-1z" />
      </svg>
    ),
  },
  {
    href: '/learn',
    label: 'Learn',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
        <path d="M2 4.5A2.5 2.5 0 014.5 2h5.879a2.5 2.5 0 011.767.732l1.622 1.621A2.5 2.5 0 0114.5 6.121V11.5a2.5 2.5 0 01-2.5 2.5h-7.5A2.5 2.5 0 012 11.5v-7zM4.5 3A1.5 1.5 0 003 4.5v7A1.5 1.5 0 004.5 13H12a1.5 1.5 0 001.5-1.5V6.121a1.5 1.5 0 00-.44-1.06L11.44 3.44a1.5 1.5 0 00-1.06-.44H4.5z" />
        <path d="M5 6.25a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5A.75.75 0 015 6.25zM5.75 8.5a.75.75 0 000 1.5h2.5a.75.75 0 000-1.5h-2.5z" />
      </svg>
    ),
  },
];

export default function Navigation() {
  const pathname = usePathname();

  if (pathname.startsWith('/session/')) return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-[#1f1f1f] bg-[#0a0a0a]">
      <div className="mx-auto flex h-11 max-w-7xl items-center px-4">
        {/* Logo */}
        <Link href="/" className="mr-6 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-[#22c55e] text-[10px] font-black text-black">
            D
          </div>
          <span className="text-[13px] font-semibold tracking-tight text-white">DistSim</span>
        </Link>

        {/* Nav items */}
        <div className="flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1f1f1f] text-white'
                    : 'text-[#525252] hover:bg-[#141414] hover:text-[#a1a1a1]'
                }`}
              >
                <span className={isActive ? 'text-[#22c55e]' : ''}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md p-1.5 text-[#3a3a3a] transition-colors hover:text-[#a1a1a1]"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
          <Link
            href="/labs?create=true"
            className="flex items-center gap-1.5 rounded-md bg-[#22c55e] px-3 py-1 text-[12px] font-semibold text-black transition-colors hover:bg-[#16a34a]"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
              <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
            </svg>
            New Lab
          </Link>
        </div>
      </div>
    </nav>
  );
}
