import { Nav } from './Nav';
import { Footer } from './Footer';
import { SavingsCalculator } from './SavingsCalculator';
import { IndividualSavings } from './IndividualSavings';

export function SavingsPage() {
  return (
    <div className="sb-shell">
      <Nav />

      <div className="sb-savings-top">
        <SavingsCalculator />
        <header className="sb-savings-intro">
          <h1 className="sb-display">See what you&apos;d save</h1>
          <p className="sb-lede-sm">
            Two views of the same question. The estimator gives you a yearly figure from what you run
            at home. The breakdown below takes today&apos;s prices in your zone and shows when each
            appliance would be cheapest to start.
          </p>
        </header>
      </div>

      <IndividualSavings />

      <a className="sb-back" href="/">
        Back to SpotSteer
      </a>

      <Footer />
    </div>
  );
}
