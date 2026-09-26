import type { ReactNode } from 'react';
import { Nav } from './Nav';
import { Footer } from './Footer';

export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="sb-shell">
      <Nav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
