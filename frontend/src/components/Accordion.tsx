import { useState, type ReactNode } from 'react';

type Item = { q: string; a: ReactNode };

export function Accordion({ items, variant }: { items: Item[]; variant: 'faq' | 'guide' }) {
  const [open, setOpen] = useState(-1);

  return (
    <div className={`sb-acc sb-acc-${variant}`}>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="sb-card sb-acc-item">
            <button
              type="button"
              className="sb-acc-q"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? -1 : i)}
            >
              {item.q}
              <span className="sb-acc-icon" data-open={isOpen} aria-hidden="true">
                +
              </span>
            </button>
            <div className="sb-acc-panel" data-open={isOpen}>
              <div>
                <div className="sb-acc-a">{item.a}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
