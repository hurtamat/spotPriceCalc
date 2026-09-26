const INSTALL_STEPS = [
  {
    n: '1',
    title: 'Copy the script',
    body: 'Press Copy script above. Everything you answered is already baked into it, so there is nothing to edit by hand.',
  },
  {
    n: '2',
    title: 'Open the Scripts tab',
    body: "In the Shelly app, select your device and open the { } tab in the left rail. Press Create new script, paste the script in, then Save and Start.",
  },
  {
    n: '3',
    title: 'Let it run on its own',
    body: 'Turn on Run on startup so the script survives a reboot. That is the last thing you do here.',
  },
];

export function InstallSteps() {
  return (
    <section id="install" className="sb-guide-section">
      <h2 className="sb-h2 sb-guide-h2">Then put it on the device</h2>
      <p className="sb-guide-sub">Three taps in the Shelly app. You only ever do this once per device.</p>
      <div className="sb-card sb-sw-install">
        <div className="sb-sw-steps">
          {INSTALL_STEPS.map((s) => (
            <div key={s.n} className="sb-sw-step">
              <span className="sb-sw-step-n">{s.n}</span>
              <div style={{ minWidth: 0 }}>
                <div className="sb-sw-step-title">{s.title}</div>
                <p className="sb-sw-step-body">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="sb-sw-shot">
          <div className="sb-sw-frame">
            <img src="/assets/shelly-scripts-tab.webp" alt="The Scripts tab in the Shelly app" />
          </div>
          <div className="sb-sw-shot-cap">
            <code>{'{ }'}</code>The Scripts tab, in the app's left rail
          </div>
        </div>
      </div>
    </section>
  );
}
