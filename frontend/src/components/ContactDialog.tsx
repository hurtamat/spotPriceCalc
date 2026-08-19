import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// TODO: real address once the domain's mailbox exists.
export const CONTACT_EMAIL = 'hello@spotbuddy.eu';

export function ContactDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (insecure origin, denied permission) — the mailto link still works.
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
        Get in touch
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 14, color: 'var(--color-neutral-700)', mb: 2 }}>
          Questions about SpotBuddy, your bidding zone, or a device we don&apos;t support yet?
          Email us, we read everything.
        </Typography>
        <div className="sb-contact-row">
          <a href={`mailto:${CONTACT_EMAIL}`} className="sb-contact-email">
            {CONTACT_EMAIL}
          </a>
          <Tooltip title={copied ? 'Copied' : 'Copy address'} placement="top">
            <IconButton onClick={copy} size="small" aria-label="Copy email address">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                {copied ? 'check' : 'content_copy'}
              </span>
            </IconButton>
          </Tooltip>
        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" href={`mailto:${CONTACT_EMAIL}`} disableElevation>
          Open mail app
        </Button>
      </DialogActions>
    </Dialog>
  );
}
