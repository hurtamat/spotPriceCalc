import { useState } from 'react';
import { ArrowRight } from './icons';

const FAQ: { q: string; a: string; link?: { href: string; label: string } }[] = [
  {
    q: 'How do you decide whether a spot price is cheap or expensive?',
    a: 'Every hour is scored against the historic price of that location using the moving average residuals method to account for current trends.',
    //link: { href: '#how', label: 'More about how it works' },
  },
    {
    q: 'How can you provide this service for free?',
    a: 'We are university graduates and the service runs on our school’s resources, so it costs us nothing to host and nothing for you to use. There is no catch on the other side either: no ads, no accounts, no cookies, and no personal data to sell.',
  },
  {
    q: 'I am on a fixed tariff. How do I switch?',
    a: 'You need a dynamic price contract, settled against the day-ahead market rather than a flat rate. Under Article 11 of the EU Electricity Market Directive, every supplier with more than 200,000 customers must offer one. Ask yours first, then your national price comparison site. SpotSteer only pays off once you are on one.',
  },
  {
    q: 'I don’t have a smart meter, what now?',
    a: 'A dynamic contract needs one, so in most markets your bill stays flat until the meter is swapped, which your supplier or grid operator arranges. SpotSteer is still useful meanwhile: read the curve and set a timer, or shift the load by hand. Once the meter and the contract are in place, the same habits start showing up on the bill, and a smart plug with Home Assistant and our add-on automates them.',
  },
  {
    q: 'Do my devices or appliances risk any harm?',
    a: 'SpotSteer only switches a plug or relay, exactly like you flipping a switch, and your comfort parameters always apply so your EV is charged when you need it to be. Leave your appliance’s own thermostats and cut-outs enabled, and keep anything safety-critical off a schedule: heating that stops pipes freezing, medical equipment, livestock.',
  },
];

export function Faq() {
  const [open, setOpen] = useState(-1);

  return (
    <section id="faq" className="sb-section">
      <div className="sb-section-head">
        <h2 className="sb-h1">Frequently asked</h2>
      </div>

      <div className="sb-faq-list">
        {FAQ.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className="sb-card sb-faq">
              <button
                className="sb-faq-q"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? -1 : i)}
              >
                {f.q}
                <span
                  className="sb-faq-icon"
                  style={{ transform: `rotate(${isOpen ? 45 : 0}deg)` }}
                >
                  +
                </span>
              </button>
              <div className="sb-faq-panel" data-open={isOpen}>
                <div>
                  <p className="sb-faq-a">
                    {f.a}
                    {f.link && (
                      <>
                        {' '}
                        <a className="sb-faq-link" href={f.link.href}>
                          {f.link.label} <ArrowRight size={14} />
                        </a>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
