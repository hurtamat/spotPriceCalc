import type { Mode } from './form';

export type Generated = { code: string } | { error: string } | null;

type Props = {
  mode: Mode;
  generated: Generated;
  chips: string[];
  copied: boolean;
  onCopy: () => void;
};

export function ScriptPanel({ mode, generated, chips, copied, onCopy }: Props) {
  const isRelay = mode === 'relay';

  return (
    <section id="script" className="sb-sw-script">
      <div className="sb-sw-script-head">
        <div style={{ marginRight: 'auto' }}>
          <span className="sb-sw-eyebrow">Ready to paste</span>
          <h2 key={mode} className="sb-h3 sb-sw-script-name sb-sw-swap">
            {isRelay ? 'spotsteer-relay.js' : 'spotsteer-colour.js'}
          </h2>
        </div>
        <div key={mode} className="sb-sw-chips sb-sw-swap">
          {chips.map((c) => (
            <span key={c} className="sb-sw-chip">
              {c}
            </span>
          ))}
        </div>
        <button
          type="button"
          className="sb-btn sb-sw-copy"
          onClick={onCopy}
          disabled={!generated || 'error' in generated}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
          {copied ? 'Copied' : 'Copy script'}
        </button>
      </div>

      {generated && 'code' in generated ? (
        <>
          <div key={mode} className="sb-sw-code sb-sw-swap">
            <code>{generated.code}</code>
          </div>
          <p className="sb-sw-script-note">One minified line. Nothing to read, just copy it.</p>
        </>
      ) : (
        <p className="sb-sw-blocked">
          {generated ? generated.error : 'Pick your price zone above and the script appears here.'}
        </p>
      )}

      {isRelay && (
        <p className="sb-sw-script-hint">
          Multi-channel device? Change <code>switchId:0</code> near the top to the channel you want,
          numbered as the Shelly app shows them.
        </p>
      )}
    </section>
  );
}
