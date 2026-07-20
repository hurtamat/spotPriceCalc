import { BrandWord } from './BrandMark';

const COLS = [
  { head: 'Product', items: ['Prices', 'Savings estimator', 'Supported devices', 'Roadmap'] },
  { head: 'Company', items: ['About', 'Blog', 'Careers', 'Contact'] },
  { head: 'Legal', items: ['Privacy policy', 'Terms of service', 'Data processing'] },
];

export function Footer() {
  return (
    <footer className="sb-footer">
      <div className="sb-footer-top">
        <div style={{ maxWidth: '30ch' }}>
          <BrandWord size={18} />
          <p style={{ fontSize: 12.5, color: 'var(--color-neutral-600)', marginTop: 12 }}>
            Automating home energy against the hourly spot market. Central Europe first.
          </p>
        </div>
        <div className="sb-footer-cols">
          {COLS.map((col) => (
            <div key={col.head}>
              <div className="sb-footer-head">{col.head}</div>
              <div className="sb-footer-col-items">
                {col.items.map((it) => (
                  <span key={it}>{it}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="sb-footer-bottom">
        <span>© 2026 SpotBuddy. All rights reserved.</span>
        <span style={{ display: 'flex', gap: 18 }}>
          <span style={{ cursor: 'default' }}>Privacy</span>
          <span style={{ cursor: 'default' }}>Terms</span>
          <span style={{ cursor: 'default' }}>Cookies</span>
          <span style={{ cursor: 'default' }}>Imprint</span>
        </span>
      </div>
    </footer>
  );
}
