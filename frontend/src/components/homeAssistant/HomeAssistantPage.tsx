import { Page } from '../Page';
import { DayFlow } from '../DayFlow';
import { GuideHero, GuideNext, GuideTroubleshooting } from '../Guide';
import { Check } from '../icons';
import { HaSteps } from './HaSteps';
import { HaPreview } from './HaPreview';
import { HaCard } from './HaCard';

const TROUBLES = [
  {
    q: 'Setup says it cannot reach SpotSteer',
    a: 'Almost always means Home Assistant cannot get online. Check that, then try again.',
  },
  {
    q: 'The card says it has no prices yet',
    a: 'Press Refresh plan on the SpotSteer device. If it stays empty, tomorrow’s prices have not been published yet. They arrive in the early afternoon and it fills in by itself.',
  },
  {
    q: 'Nothing switches on',
    a: 'Check Enabled is on, and that Controlled switch still points at a device that exists. If both are fine, your settings may not fit together: four hours needed, finished by 02:00, and quiet hours across the whole night leave nowhere to run.',
  },
  {
    q: 'The prices look like somebody else’s',
    a: 'That is the zone, not the clock. Open SpotSteer in Home Assistant, press Configure, and check the electricity zone. Times themselves are always shown in yours.',
  },
];

const NEXT = [
  {
    href: '/shelly',
    kicker: 'No Home Assistant?',
    title: 'Set up a Shelly instead',
    body: 'A Shelly plug runs the same cheap hours on its own.',
  },
];

export function HomeAssistantPage() {
  return (
    <Page>
      <div className="sb-guide">
        <GuideHero
          logo="/assets/logo-homeassistant.png"
          logoAlt="Home Assistant"
          badge="Setup guide"
          title="Configure your Home Assistant"
          lede="SpotSteer watches tomorrow’s electricity prices and switches your boiler, car charger or washing machine on when power is cheap."
          meta={['~5 minutes', 'Home Assistant 2024.11+', 'Installed through HACS']}
        />

        <HaSteps />

        <section className="sb-guide-section">
          <div className="sb-guide-dark">
            <div className="sb-guide-glow" aria-hidden="true" />
            <div className="sb-ha-done-inner">
              <div className="sb-ha-done-head">
                <span className="sb-ha-done-check">
                  <Check size={18} strokeWidth={2.6} />
                </span>
                <h2 className="sb-h2">That&rsquo;s it</h2>
              </div>
              <p>
                If you picked a device in step 2, you are finished. SpotSteer turns it on when the
                cheap hours start and off when they end. Flip it by hand any time and it stays that
                way until the next quarter hour.
              </p>
            </div>
          </div>
        </section>

        <HaPreview />
        <HaCard />
        <DayFlow />
        <GuideTroubleshooting items={TROUBLES} />
        <GuideNext links={NEXT} />
      </div>
    </Page>
  );
}
