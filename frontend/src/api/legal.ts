/**
 * Loads the Termly-generated legal documents from `public/legal/`.
 *
 * The files are kept **exactly as Termly exported them** so `/legal/privacy.html` and
 * `/legal/terms.html` stay valid standalone pages we can link from email or hand to Termly.
 * Everything needed to embed them in the app happens here, at runtime, on a copy.
 */

export type LegalKind = 'privacy' | 'terms';

export const LEGAL_URLS: Record<LegalKind, string> = {
  privacy: '/legal/privacy.html',
  terms: '/legal/terms.html',
};

/** The class the dialog puts on the wrapper; every rule from Termly gets confined to it. */
const SCOPE = '.sb-legal';

/**
 * Termly's export opens with a ~7KB `<span>` whose background is a base64 Termly logo.
 * Fine on a standalone page, wrong inside our dialog — the document already has a title.
 */
function stripTermlyLogo(html: string): string {
  return html.replace(/<span style="display: block;[^"]*base64[\s\S]*?<\/span>/, '');
}

/**
 * Prefixes every selector in a stylesheet with {@link SCOPE}.
 *
 * Load-bearing, not cosmetic: Termly's second `<style>` block styles bare `ul`,
 * `ul > li > ul`, and `ol li` with no scoping at all. Injected as-is those rules apply
 * to the whole page and restyle the FAQ and device lists behind the dialog.
 */
function scopeCss(css: string, scope: string): string {
  return css.replace(/(^|\})([^{}]+)\{/g, (match, close: string, selectors: string) => {
    // Leave at-rules (@media, @supports) alone — their contents are a nested block we
    // never see here. Termly's exports have none today; this is just so adding one
    // upstream can't silently produce broken CSS.
    if (selectors.trim().startsWith('@')) return match;

    const scoped = selectors
      .split(',')
      .map((selector) => {
        const trimmed = selector.trim();
        return trimmed ? `${scope} ${trimmed}` : '';
      })
      .filter(Boolean)
      .join(', ');

    return `${close}${scoped}{`;
  });
}

function scopeStyleBlocks(html: string): string {
  return html.replace(
    /<style>([\s\S]*?)<\/style>/g,
    (_, css: string) => `<style>${scopeCss(css, SCOPE)}</style>`,
  );
}

/** Termly's markup targets `_blank` inconsistently; make every outbound link safe. */
function hardenLinks(html: string): string {
  return html.replace(/<a\s/g, '<a target="_blank" rel="noopener noreferrer" ');
}

const cache = new Map<LegalKind, string>();

/**
 * Fetches a legal document and prepares it for embedding. Cached per kind, so reopening
 * the dialog costs nothing. Throws on a failed fetch — the caller shows the fallback link.
 */
export async function loadLegalDocument(kind: LegalKind): Promise<string> {
  const cached = cache.get(kind);
  if (cached) return cached;

  const response = await fetch(LEGAL_URLS[kind]);
  if (!response.ok) {
    throw new Error(`Failed to load ${kind} document: ${response.status}`);
  }

  const prepared = hardenLinks(scopeStyleBlocks(stripTermlyLogo(await response.text())));
  cache.set(kind, prepared);
  return prepared;
}
