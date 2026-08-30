import { useState } from 'react';
import { ContactDialog } from './ContactDialog';
import { LegalDialog, type LegalKind } from './LegalDialog';

export function Footer() {
  const [contactOpen, setContactOpen] = useState(false);
  const [legalKind, setLegalKind] = useState<LegalKind | null>(null);

  return (
    <footer className="sb-footer">
      <div className="sb-footer-bottom">
        <span>© 2026 SpotBuddy. All rights reserved.</span>
        <span style={{ display: 'flex', gap: 18 }}>
          <button type="button" className="sb-footer-link" onClick={() => setLegalKind('privacy')}>
            Privacy
          </button>
          <button type="button" className="sb-footer-link" onClick={() => setLegalKind('terms')}>
            Terms
          </button>
          <button type="button" className="sb-footer-link" onClick={() => setContactOpen(true)}>
            Contact
          </button>
        </span>
      </div>
      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} />
      {/* Kept mounted while closing so the dialog can animate out with its content intact. */}
      <LegalDialog
        kind={legalKind ?? 'privacy'}
        open={legalKind !== null}
        onClose={() => setLegalKind(null)}
      />
    </footer>
  );
}
