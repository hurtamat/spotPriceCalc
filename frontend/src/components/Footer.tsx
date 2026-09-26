import { BrandWord } from './BrandMark';
import { SITE, ROUTES } from '../config/site';

export function Footer() {
  return (
    <footer className="sb-footer">
      <div className="sb-footer-bottom">
        <span className="sb-footer-brand">
          <BrandWord markSize={26} />
        </span>
        <span className="sb-footer-copy">© 2026 {SITE.name}</span>
        <span className="sb-footer-links">
          <a className="sb-footer-link" href={ROUTES.privacy}>
            Privacy
          </a>
          <a className="sb-footer-link" href={ROUTES.terms}>
            Terms
          </a>
          <a className="sb-footer-link" href={ROUTES.contact}>
            Contact
          </a>
        </span>
      </div>
    </footer>
  );
}
