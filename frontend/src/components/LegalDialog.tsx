import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { loadLegalDocument, LEGAL_URLS, type LegalKind } from '../api/legal';

export type { LegalKind };

const TITLES: Record<LegalKind, string> = {
  privacy: 'Privacy Policy',
  terms: 'Terms and Conditions',
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
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;

    // Reset per open/kind so a previous document never flashes under the new title.
    setHtml(null);
    setFailed(false);

    let active = true;
    loadLegalDocument(kind)
      .then((loaded) => active && setHtml(loaded))
      .catch(() => active && setFailed(true));

    return () => {
      active = false;
    };
  }, [kind, open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
        {TITLES[kind]}
      </DialogTitle>
      <DialogContent dividers sx={{ minHeight: 240 }}>
        {failed ? (
          <Typography sx={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>
            We couldn&apos;t load this document.{' '}
            <a href={LEGAL_URLS[kind]} target="_blank" rel="noopener noreferrer">
              Open it in a new tab
            </a>
            .
          </Typography>
        ) : html === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <CircularProgress size={28} />
          </div>
        ) : (
          // Our own build-time asset, scoped by scopeStyleBlocks in api/legal.ts; no user input reaches this.
          <div className="sb-legal" dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button href={LEGAL_URLS[kind]} target="_blank" rel="noopener noreferrer">
          Open as page
        </Button>
        <Button variant="contained" onClick={onClose} disableElevation>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
