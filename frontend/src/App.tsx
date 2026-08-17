import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { PriceSection } from './components/PriceSection';
import { HowItWorks } from './components/HowItWorks';
import { Devices } from './components/Devices';
import { Faq } from './components/Faq';
// CtaStrip ("Ready to let cheap hours pay your bill?") is kept but not rendered.
import { Footer } from './components/Footer';

export default function App() {
  return (
    <div className="sb-shell">
      <Nav />
      <Hero />
      <PriceSection />
      <HowItWorks />
      <Devices />
      <Faq />
      <Footer />
    </div>
  );
}
