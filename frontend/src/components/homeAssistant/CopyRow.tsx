import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';

export function CopyRow({ text }: { text: string }) {
  const [copied, copy] = useCopyToClipboard();

  return (
    <div className="sb-ha-copyrow">
      <code>{text}</code>
      <button type="button" className="sb-btn sb-primary sb-ha-copybtn" onClick={() => copy(text)}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
