import { useState } from 'react';
import { ContactDialog } from './ContactDialog';

export function Footer() {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <footer className="sb-footer">
      <div className="sb-footer-bottom">
        <span>© 2026 SpotBuddy. All rights reserved.</span>
        <span style={{ display: 'flex', gap: 18 }}>
          <span style={{ cursor: 'default' }}>Privacy</span>
          <span style={{ cursor: 'default' }}>Terms</span>
          <button type="button" className="sb-footer-link" onClick={() => setContactOpen(true)}>
            Contact
          </button>
        </span>
      </div>
      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} />
    </footer>
  );
}
