/** A named individual, not a company: there is no legal entity behind SpotSteer. */
export const OPERATOR = {
  name: 'Matej Hurta',
  /** Geographic, not a PO box: EU transparency rules want the real one. */
  street: 'Thakurova 1',
  city: 'Prague',
  postalCode: '160 41',
  country: 'Czechia',
} as const;

/** One line, for prose and meta tags. */
export const OPERATOR_ADDRESS_LINE = `${OPERATOR.street}, ${OPERATOR.postalCode} ${OPERATOR.city}, ${OPERATOR.country}`;

/** The postal lines alone, for the block on /contact, which prints the name itself. */
export const OPERATOR_ADDRESS_LINES: readonly string[] = [
  OPERATOR.street,
  `${OPERATOR.postalCode} ${OPERATOR.city}`,
  OPERATOR.country,
];

export const SITE = {
  name: 'SpotSteer',
  /** No trailing slash. */
  origin: 'https://spotsteer.eu',
  /** The single public mailbox: privacy requests, terms questions and support alike. */
  contactEmail: 'hello@spotsteer.eu',
  /** Supervisory authority for a controller in Czechia. */
  dataProtectionAuthority: {
    name: 'Úřad pro ochranu osobních údajů',
    englishName: 'Czech Data Protection Authority',
    url: 'https://uoou.gov.cz',
  },
} as const;

/** Internal routes. Anything a legal document names belongs here, not inline. */
export const ROUTES = {
  home: '/',
  savings: '/savings',
  shelly: '/shelly',
  homeAssistant: '/home-assistant',
  privacy: '/privacy',
  terms: '/terms',
  contact: '/contact',
} as const;

export type RouteKey = keyof typeof ROUTES;

/** Absolute URL for a route: canonical tags, sitemap, legal documents. */
export function absoluteUrl(route: string): string {
  return `${SITE.origin}${route === '/' ? '/' : route}`;
}

/** Substitution table for `public/legal/*.html`, used there as `{{key}}`. */
export const LEGAL_TOKENS: Record<string, string> = {
  siteName: SITE.name,
  siteUrl: SITE.origin,
  contactEmail: SITE.contactEmail,
  operatorName: OPERATOR.name,
  operatorStreet: OPERATOR.street,
  operatorCity: OPERATOR.city,
  operatorPostalCode: OPERATOR.postalCode,
  operatorCountry: OPERATOR.country,
  operatorAddressLine: OPERATOR_ADDRESS_LINE,
  dpaName: SITE.dataProtectionAuthority.name,
  dpaEnglishName: SITE.dataProtectionAuthority.englishName,
  dpaUrl: SITE.dataProtectionAuthority.url,
  privacyUrl: absoluteUrl(ROUTES.privacy),
  termsUrl: absoluteUrl(ROUTES.terms),
  contactUrl: absoluteUrl(ROUTES.contact),
};
