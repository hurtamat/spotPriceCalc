/** Loads the Termly-generated legal documents from `public/legal/`, kept exactly as exported. */

export type LegalKind = 'privacy' | 'terms';

export const LEGAL_URLS: Record<LegalKind, string> = {
  privacy: '/legal/privacy.html',
  terms: '/legal/terms.html',
};

/** The class the dialog puts on the wrapper; every rule from Termly gets confined to it. */
const SCOPE = '.sb-legal';

/** Strips the ~7KB `<span>` logo Termly's export opens with; wrong inside our dialog. */
function stripTermlyLogo(html: string): string {
  return html.replace(/<span style="display: block;[^"]*base64[\s\S]*?<\/span>/, '');
}

/** Drops the document's own `<h1>` and its wrapping div; the dialog header already names it. */
function stripDocumentTitle(html: string): string {
  return html.replace(/<div[^>]*>(?:(?!<\/?div)[\s\S])*?<h1[\s\S]*?<\/h1>(?:(?!<\/?div)[\s\S])*?<\/div>/, '');
}

/** Collapses runs of Termly's empty spacer divs down to a single one. */
function collapseBlankRuns(html: string): string {
  return html.replace(
    /(?:<div[^>]*>\s*<br\s*\/?>\s*<\/div>\s*){2,}/g,
    '<div><br></div>',
  );
}

/** Prefixes every selector in a stylesheet with {@link SCOPE}, so bare `ul`/`ol li` rules don't leak. */
function scopeCss(css: string, scope: string): string {
  return css.replace(/(^|\})([^{}]+)\{/g, (match, close: string, selectors: string) => {
    // Leave at-rules (@media, @supports) alone; their contents are a nested block we never see here.
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

/** Fetches a legal document and prepares it for embedding. Cached per kind. */
export async function loadLegalDocument(kind: LegalKind): Promise<string> {
  const cached = cache.get(kind);
  if (cached) return cached;

  const response = await fetch(LEGAL_URLS[kind]);
  if (!response.ok) {
    throw new Error(`Failed to load ${kind} document: ${response.status}`);
  }

  const prepared = hardenLinks(
    scopeStyleBlocks(collapseBlankRuns(stripDocumentTitle(stripTermlyLogo(await response.text())))),
  );
  cache.set(kind, prepared);
  return prepared;
}
