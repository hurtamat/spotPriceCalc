import { Page } from './Page';
import { SavingsCalculator } from './SavingsCalculator';
import { IndividualSavings } from './IndividualSavings';
import { METHODOLOGY_PDF } from '../config/site';

export function SavingsPage() {
  return (
    <Page>
      <div className="sb-savings-top">
        <SavingsCalculator />
        <header className="sb-savings-intro">
          <h1 className="sb-display">See what you&apos;d save</h1>
          <p className="sb-lede-sm">
            Two views of the same question. The estimator gives you a yearly figure from what you run
            at home. The breakdown below takes today&apos;s prices in your zone and shows when each
            appliance would be cheapest to start. Our{' '}
            <a className="sb-text-link" href={METHODOLOGY_PDF} target="_blank" rel="noopener noreferrer">
              methodology
            </a>{' '}
            explains how both are worked out.
          </p>
        </header>
      </div>

      <IndividualSavings />

      <a className="sb-back" href="/">
        Back to SpotSteer
      </a>
    </Page>
  );
}
