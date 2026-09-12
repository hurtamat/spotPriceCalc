import { Nav } from './components/Nav';
import { Hero, Claims } from './components/Hero';
import { PriceSection } from './components/PriceSection';
import { SavingsTeaser } from './components/SavingsTeaser';
import { HowItWorks } from './components/HowItWorks';
import { Devices } from './components/Devices';
import { Faq } from './components/Faq';
import { Footer } from './components/Footer';
import { SavingsPage } from './components/SavingsPage';
import { ShellyWizard } from './components/ShellyWizard';
import { LegalPage } from './components/LegalPage';
import { useScrollReveal } from './hooks/useScrollReveal';
import { usePageTitle } from './hooks/usePageTitle';
import { HomeAssistantPage } from './components/HomeAssistantPage';

// Path routing without a router dependency, a handful of static pages is not worth react-router.

export default function App() {
  // Every page gets the scroll-in effect, so it is mounted here rather than per page.
  useScrollReveal();

  const path = window.location.pathname.replace(/\/+$/, '') || '/';

  // Tab titles live here rather than in each page, because this is the only place
  // that knows the route. The landing page is the brand alone; everything else is
  // the brand plus where you are.
  usePageTitle(path);
  if (path === '/home-assistant') return <HomeAssistantPage />;
  if (path === '/shelly') return <ShellyWizard />;
  if (path === '/savings') return <SavingsPage />;
  if (path === '/privacy') return <LegalPage kind="privacy" />;
  if (path === '/terms') return <LegalPage kind="terms" />;

  return (
    <div className="sb-shell">
      <Nav />
      <Hero />
      <Claims />
      <PriceSection />
      <SavingsTeaser />
      <HowItWorks />
      <Devices />
      <Faq />
      <Footer />
    </div>
  );
}
