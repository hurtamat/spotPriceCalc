// The strip under both setup-guide headlines, so /shelly and /home-assistant
// open the same way. The first item carries the clock.
import { Clock } from './icons';

type Props = { items: string[] };

export function GuideMeta({ items }: Props) {
  return (
    <div className="sb-guide-meta">
      {items.map((item, i) => (
        <span key={item} className="sb-guide-meta-item">
          {i === 0 && <Clock size={14} strokeWidth={1.8} />}
          {item}
        </span>
      ))}
    </div>
  );
}
