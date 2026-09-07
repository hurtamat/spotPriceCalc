import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { PriceSection } from './components/PriceSection';
import { IndividualSavings } from './components/IndividualSavings';
import { HowItWorks } from './components/HowItWorks';
import { Devices } from './components/Devices';
import { Faq } from './components/Faq';
// CtaStrip ("Ready to let cheap hours pay your bill?") is kept but not rendered.
import { Footer } from './components/Footer';
import { ConfigurePage } from './components/ConfigurePage';
import { ShellyWizard } from './components/ShellyWizard';
import { HomeAssistantPage } from './components/HomeAssistantPage';

// Path routing without a router dependency, a handful of static pages is not worth react-router.
// ConfigurePage is the placeholder the remaining "Configure" buttons still point at.
const PAGES: Record<string, string> = {};

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/home-assistant') return <HomeAssistantPage />;
  if (path === '/shelly') return <ShellyWizard />;

  const page = PAGES[path];
  if (page) return <ConfigurePage title={page} />;

  return (
    <div className="sb-shell">
      <Nav />
      <Hero />
      <PriceSection />
      <IndividualSavings />
      <HowItWorks />
      <Devices />
      <Faq />
      <Footer />
    </div>
  );
}
