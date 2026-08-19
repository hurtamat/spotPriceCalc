import { Nav } from './Nav';
import { Footer } from './Footer';

// Empty landing pages behind the Devices "Configure" buttons. The setup wizard goes here.
export function ConfigurePage({ title }: { title: string }) {
  return (
    <div className="sb-shell">
      <Nav />
      <section className="sb-section" style={{ minHeight: '50vh' }}>
        <h1 style={{ fontSize: 'clamp(28px,4vw,42px)' }}>{title}</h1>
        <p style={{ color: 'var(--color-neutral-600)', marginTop: 12 }}>
          Setup wizard coming soon. <a href="/">Back to SpotBuddy →</a>
        </p>
      </section>
      <Footer />
    </div>
  );
}
