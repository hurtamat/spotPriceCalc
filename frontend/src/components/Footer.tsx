import { useState } from 'react';
import { ContactDialog } from './ContactDialog';

export function Footer() {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <footer className="sb-footer">
      <div className="sb-footer-bottom">
        <span>© 2026 SpotBuddy. All rights reserved.</span>
        <span style={{ display: 'flex', gap: 18 }}>
          {/* Real links, not buttons: legal documents are things people bookmark, share and print. */}
          <a className="sb-footer-link" href="/privacy">
            Privacy
          </a>
          <a className="sb-footer-link" href="/terms">
            Terms
          </a>
          <button type="button" className="sb-footer-link" onClick={() => setContactOpen(true)}>
            Contact
          </button>
        </span>
      </div>
      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} />
    </footer>
  );
}
