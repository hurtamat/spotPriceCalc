import { useState } from 'react';

const FAQ = [
  {
    q: 'What exactly is a spot price?',
    a: 'It is the wholesale price of electricity for one specific hour, set on the power exchange the day before delivery. Because supply (wind, solar, demand) shifts through the day, the price can swing several-fold between 3am and 6pm. SpotBuddy uses that hourly curve to decide when your devices should run.',
  },
  {
    q: 'Why do I need a dynamic / spot tariff — won’t a fixed one work?',
    a: 'On a fixed tariff you pay the same rate every hour, so shifting load to cheap hours saves you nothing on paper. A dynamic (spot) tariff bills you the real hourly price, so moving flexible loads into the cheap hours directly lowers your bill. Ask your supplier for an hourly-settled / spot product — then SpotBuddy pays off.',
  },
  {
    q: 'Do my devices or appliances risk any harm?',
    a: 'No. SpotBuddy only switches a relay or plug on and off at sensible times, exactly like you flipping a switch — with comfort limits so, e.g., the boiler never drops below your set temperature. Nothing is over-driven.',
  },
  {
    q: 'Do I need a smart meter?',
    a: 'Not for the automation itself — SpotBuddy works from the published market prices and your smart switches. You do need a dynamic tariff from your supplier to be billed at those hourly prices, which usually comes with an interval/smart meter.',
  },
  {
    q: 'How is my price zone chosen?',
    a: 'Europe is divided into bidding zones (often one per country, sometimes split). You pick your location and we lock onto that zone’s day-ahead curve — no manual price entry.',
  },
  {
    q: 'What will SpotBuddy cost?',
    a: 'We are finalising pricing for the beta. The plan is a small flat subscription that stays well below what an average flexible household saves. Join the waitlist and you’ll be first to know.',
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
                  <p className="sb-faq-a">{f.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
