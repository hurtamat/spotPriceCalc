import { useState } from 'react';

const FAQ: { q: string; a: string; link?: { href: string; label: string } }[] = [
  {
    q: 'How can you provide this service for free?',
    a: 'We are university graduates and the service runs on our school’s resources, so it costs us nothing to host and nothing for you to use.',
  },
  {
    q: 'How do you decide whether a spot price is cheap or expensive?',
    a: 'Every hour is scored against the recent price history of your own bidding zone, then marked green, yellow or red. Your devices follow that.',
    link: { href: '#how', label: 'More about how it works' },
  },
  {
    q: 'I pay a flat price for electricity, what now?',
    a: 'On a flat tariff 3am and 6pm cost the same, so there is nothing to shift yet. Almost every European country has suppliers offering a dynamic (spot) tariff billed at the real hourly price. Ask yours for one, and SpotBuddy starts paying off.',
  },
  {
    q: 'I don’t have a smart meter, what now?',
    a: 'You can still use SpotBuddy. Read the price curve and set a timer, or just switch things on during the cheap hours yourself. To automate it later, the simplest route is a smart plug with Home Assistant and our add-on.',
  },
  {
    q: 'Do my devices or appliances risk any harm?',
    a: 'No. SpotBuddy just switches a plug or relay on and off, exactly like you flipping a switch, and your comfort limits still apply so the boiler never drops below your set temperature.',
  },
];

export function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="sb-section">
      <h2 style={{ textAlign: 'center', fontSize: 'clamp(26px,3.6vw,38px)', marginBottom: 26 }}>
        Frequently asked
      </h2>
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
                          {f.link.label} →
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
