import { useEffect } from 'react';
import { Nav } from './Nav';
import { Footer } from './Footer';
import { SavingsCalculator } from './SavingsCalculator';
import { IndividualSavings } from './IndividualSavings';
import { dateForDay, fetchSpotPrices } from '../api/spotPrices';
import { publishSelection } from '../state/selectionStore';

// Germany-Luxembourg, the same default PriceSection starts on.
const DEFAULT_ZONE_ID = 7;

/** /savings. The estimator and the per-appliance breakdown, which used to crowd the
 *  landing page, live here together: both answer "what is this worth to me", and
 *  neither belongs above the product itself.
 *
 *  The landing page feeds the selection store from the map. There is no map here, so
 *  this page seeds the store itself with the default zone's curve. */
export function SavingsPage() {
  useEffect(() => {
    document.title = 'What could you save? · SpotSteer';
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchSpotPrices(DEFAULT_ZONE_ID, dateForDay('today'), controller.signal)
      .then((data) => publishSelection({ zoneId: DEFAULT_ZONE_ID, day: 'today', data }))
      .catch(() => {
        // The appliance cards already render a pending state without a curve, so a
        // failed fetch needs no separate error surface here.
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="sb-shell">
      <Nav />

      <header className="sb-savings-head">
        <h1>What could you save?</h1>
        <p>
          Two views of the same question. The estimator gives you a yearly figure from what you run
          at home. The breakdown below takes today&apos;s curve and shows when each appliance would
          be cheapest to start.
        </p>
      </header>

      <div className="sb-savings-grid">
        <SavingsCalculator />
        <IndividualSavings />
      </div>

      <a className="sb-back" href="/">
        Back to SpotSteer
      </a>

      <Footer />
    </div>
  );
}
