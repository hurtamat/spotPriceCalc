import { Page } from './Page';
import { SITE, OPERATOR, HELPER, OPERATOR_ADDRESS_LINES, ROUTES } from '../config/site';
import { ArrowLeft, Check, Copy } from './icons';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

export function ContactPage() {
  const [copied, copy] = useCopyToClipboard();

  return (
    <Page>
      <section className="sb-section sb-contact-page">
        <a className="sb-backlink" href={ROUTES.home}>
          <ArrowLeft size={14} />
          Back to {SITE.name}
        </a>
        <h1 className="sb-h1 sb-legal-title">Contact</h1>

        <p className="sb-lede-sm sb-contact-lead">
          Questions about {SITE.name}, your bidding zone, or a device we don&apos;t support yet?
          One mailbox, read by a person.
        </p>

        <div className="sb-contact-row">
          <a href={`mailto:${SITE.contactEmail}`} className="sb-contact-email">
            {SITE.contactEmail}
          </a>
          <button
            type="button"
            className="sb-btn sb-contact-copy"
            onClick={() => copy(SITE.contactEmail)}
            aria-label="Copy email address"
          >
            {copied ? <Check /> : <Copy />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <p className="sb-fine sb-contact-note">
          Data protection requests (access, correction, erasure, objection) go to the same
          address. See the <a href={ROUTES.privacy}>privacy notice</a> for what we hold, which is
          very little.
        </p>

        <h2 className="sb-h4 sb-contact-h2">Who runs this site</h2>
        <address className="sb-impressum">
          <span className="sb-impressum-name">{OPERATOR.name}</span>
          <span className="sb-impressum-name">{HELPER.name}</span>
          {OPERATOR_ADDRESS_LINES.map((line) => (
            <span key={line}>{line}</span>
          ))}
          <span>
            <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>
          </span>
        </address>

        <p className="sb-fine sb-contact-note">
          {SITE.name} is run by an individual, not a company, so there is no company number, VAT
          number or trade register entry to quote. Responsible for the content of this site under
          § 55 of the Czech Press Act and Art. 5 of Directive 2000/31/EC: {OPERATOR.name}.
        </p>

        <a className="sb-back" href={ROUTES.home}>
          Back to {SITE.name}
        </a>
      </section>
    </Page>
  );
}
