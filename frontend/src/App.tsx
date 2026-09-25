import { Hero, Claims } from './components/Hero';
import { PriceSection } from './components/PriceSection';
import { SavingsTeaser } from './components/SavingsTeaser';
import { HowItWorks } from './components/HowItWorks';
import { Devices } from './components/Devices';
import { Faq } from './components/Faq';
import { Page } from './components/Page';
import { SavingsPage } from './components/SavingsPage';
import { ShellyWizard } from './components/shelly/ShellyWizard';
import { LegalPage } from './components/LegalPage';
import { ContactPage } from './components/ContactPage';
import { ROUTES } from './config/site';
import { useScrollReveal } from './hooks/useScrollReveal';
import { usePageMeta } from './hooks/usePageMeta';
import { HomeAssistantPage } from './components/homeAssistant/HomeAssistantPage';

// Path routing without a router dependency, a handful of static pages is not worth react-router.

export default function App() {
  // Every page gets the scroll-in effect, so it is mounted here rather than per page.
  useScrollReveal();

  const path = window.location.pathname.replace(/\/+$/, '') || '/';

  // Tab titles live here rather than in each page, because this is the only place
  // that knows the route. The landing page is the brand alone; everything else is
  // the brand plus where you are.
  usePageMeta(path);
  if (path === ROUTES.homeAssistant) return <HomeAssistantPage />;
  if (path === ROUTES.shelly) return <ShellyWizard />;
  if (path === ROUTES.savings) return <SavingsPage />;
  if (path === ROUTES.privacy) return <LegalPage kind="privacy" />;
  if (path === ROUTES.terms) return <LegalPage kind="terms" />;
  if (path === ROUTES.contact) return <ContactPage />;

  return (
    <Page>
      <Hero />
      <Claims />
      <PriceSection />
      <SavingsTeaser />
      <HowItWorks />
      <Devices />
      <Faq />
    </Page>
  );
}
