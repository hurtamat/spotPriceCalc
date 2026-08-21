import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

export type LegalKind = 'privacy' | 'terms';

/**
 * ⚠️ PLACEHOLDER TEXT — REPLACE BEFORE LAUNCH.
 *
 * Everything in LEGAL_CONTENT below is filler so the dialogs render. Matej supplies
 * the real Privacy Policy and Terms of Service copy. Each entry is:
 *   title      — the dialog heading
 *   updated    — "last updated" date shown under the heading
 *   sections[] — { heading, body } rendered in order; body may be several paragraphs
 *                (split on blank lines).
 * Add/remove sections freely — the renderer just walks the array.
 */
const LEGAL_CONTENT: Record<
  LegalKind,
  { title: string; updated: string; sections: { heading: string; body: string }[] }
> = {
  privacy: {
    title: 'Privacy Policy',
    updated: 'TODO — last updated date',
    sections: [
      {
        heading: '1. Who we are',
        body: 'TODO: legal entity name, registered address, and contact address for privacy questions (GDPR data-controller identification).',
      },
      {
        heading: '2. What data we collect',
        body: 'TODO: account data (email), device data (Shelly device ids, coordinates/bidding zone, schedule settings), and technical data (logs, IP).',
      },
      {
        heading: '3. Why we process it',
        body: 'TODO: legal basis per purpose — contract performance for running the optimisation, legitimate interest for service operation and security, consent for anything optional.',
      },
      {
        heading: '4. Sharing and sub-processors',
        body: 'TODO: hosting (Microsoft Azure, West Europe), data sources (ENTSO-E, Open-Meteo), and any analytics or email provider.',
      },
      {
        heading: '5. Retention',
        body: 'TODO: how long account data, device schedules, and logs are kept.',
      },
      {
        heading: '6. Your rights',
        body: 'TODO: access, rectification, erasure, portability, objection, and the right to complain to a supervisory authority.',
      },
      {
        heading: '7. Contact',
        body: 'TODO: privacy contact address.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    updated: 'TODO — last updated date',
    sections: [
      {
        heading: '1. The service',
        body: 'TODO: SpotBuddy computes on/off schedules from day-ahead spot prices and sends them to devices the customer already owns. Describe what is and is not included.',
      },
      {
        heading: '2. Accounts',
        body: 'TODO: eligibility, accurate information, responsibility for credentials.',
      },
      {
        heading: '3. Subscription and billing',
        body: 'TODO: price, billing period, renewal, cancellation, refunds, and the statutory withdrawal right for EU consumers.',
      },
      {
        heading: '4. Acceptable use',
        body: 'TODO: no reverse engineering, no reselling schedules, no interfering with the service.',
      },
      {
        heading: '5. No guarantee of savings',
        body: 'TODO — important one: prices come from third parties (ENTSO-E), schedules are advisory, and actual savings depend on the tariff, the devices, and consumption. No warranty of a specific saving.',
      },
      {
        heading: '6. Liability',
        body: 'TODO: limitation of liability, especially around device control and any damage to appliances.',
      },
      {
        heading: '7. Changes and termination',
        body: 'TODO: how terms change, notice period, and how either side ends the agreement.',
      },
      {
        heading: '8. Governing law',
        body: 'TODO: jurisdiction and applicable law.',
      },
    ],
  },
};

export function LegalDialog({
  kind,
  open,
  onClose,
}: {
  kind: LegalKind;
  open: boolean;
  onClose: () => void;
}) {
  const doc = LEGAL_CONTENT[kind];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle sx={{ fontFamily: 'var(--font-heading)', fontWeight: 700, pb: 0.5 }}>
        {doc.title}
      </DialogTitle>
      <DialogContent dividers>
        <Typography sx={{ fontSize: 12, color: 'var(--color-neutral-600)', mb: 2 }}>
          Last updated: {doc.updated}
        </Typography>
        {doc.sections.map((section) => (
          <section key={section.heading} style={{ marginBottom: 20 }}>
            <Typography
              component="h3"
              sx={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15, mb: 0.75 }}
            >
              {section.heading}
            </Typography>
            {section.body.split('\n\n').map((paragraph, i) => (
              <Typography
                key={i}
                sx={{ fontSize: 14, color: 'var(--color-neutral-700)', mb: 1, lineHeight: 1.6 }}
              >
                {paragraph}
              </Typography>
            ))}
          </section>
        ))}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="contained" onClick={onClose} disableElevation>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
