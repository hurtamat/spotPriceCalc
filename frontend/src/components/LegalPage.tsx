import { useEffect, useState } from 'react';
import { Page } from './Page';
import { loadLegalDocument, LEGAL_URLS, type LegalKind } from '../api/legal';
import { ArrowLeft } from './icons';

export type { LegalKind };

const TITLES: Record<LegalKind, string> = {
  privacy: 'Privacy Policy',
  terms: 'Terms and Conditions',
};

/**
 * A legal document as its own page rather than a dialog: these are things people link to, cite, print
 * and are asked to read before agreeing — all of which want an address of their own.
 */
export function LegalPage({ kind }: { kind: LegalKind }) {
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setHtml(null);
    setFailed(false);

    let active = true;
    loadLegalDocument(kind)
      .then((loaded) => active && setHtml(loaded))
      .catch(() => active && setFailed(true));

    return () => {
      active = false;
    };
  }, [kind]);

  return (
    <Page>
      <section className="sb-section sb-legal-page">
        <a className="sb-backlink" href="/">
          <ArrowLeft size={14} />
          Back to SpotSteer
        </a>
        <h1 className="sb-h1 sb-legal-title">{TITLES[kind]}</h1>

        {failed ? (
          <p className="sb-legal-state">
            We couldn&apos;t load this document.{' '}
            <a href={LEGAL_URLS[kind]} target="_blank" rel="noopener noreferrer">
              Open the original
            </a>
            .
          </p>
        ) : html === null ? (
          <p className="sb-legal-state">Loading…</p>
        ) : (
          // Our own build-time asset, scoped by scopeStyleBlocks in api/legal.ts; no user input reaches this.
          <div className="sb-legal" dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </section>
    </Page>
  );
}
