import { useMemo, useState } from 'react';
import { useZonePicker } from '../../hooks/useZonePicker';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { pad2 } from '../../lib/format';
import { generatePriceColorScript, generateScheduleScript } from '../../shelly/generate';
import { Page } from '../Page';
import { DayFlow } from '../DayFlow';
import { GuideHero, GuideNext, GuideTroubleshooting } from '../Guide';
import { INITIAL_FORM, type Mode, type WizardForm } from './form';
import { WizardQuestions } from './WizardQuestions';
import { ScriptPanel, type Generated } from './ScriptPanel';
import { InstallSteps } from './InstallSteps';
import { OnDevicePanel } from './OnDevicePanel';

const TROUBLES = [
  {
    q: 'The new sliders never appeared in the Shelly app',
    a: 'They only work on a Shelly Gen2 or newer with up-to-date firmware, so update the Shelly first, then press Stop and Start on the script once so it can try again. If the app still shows nothing, swipe down on the device page to refresh it. Until you do, the app keeps showing you the screen as it was before.',
  },
  {
    q: 'The script stops whenever the Shelly loses power',
    a: 'Run on startup is switched off, so the script does not come back by itself. Open Scripts, press the pencil next to the script, turn Run on startup on, then press Start.',
  },
  {
    q: 'The relay never switches on',
    a: 'Usually the settings leave it nowhere to run: four hours of power, finished by 02:00, and a do-not-run window across the night do not fit together, so widen one of them. If that is not it, check the Shelly is online, then open the script and read the messages it prints underneath. It lists the hours it picked, or says why it could not pick any.',
  },
  {
    q: 'I replaced the script and now there are two sets of sliders',
    a: 'Deleting a script does not delete the sliders it added, and a new script never takes the old ones over. It adds its own, so you end up looking at both while only one of them does anything. Delete the leftover ones first, in the Shelly web page under Virtual components, then start the new script.',
  },
  {
    q: 'The script keeps printing an error about something being "not defined"',
    a: 'A script was replaced while it was still running, and one leftover instruction from the old one keeps going off looking for code that is no longer there. The giveaway is the timing: the errors arrive evenly, once every five minutes. Press Stop, then Start. If they keep coming, restart the Shelly, which clears them for good.',
  },
];

const NEXT = [
  {
    href: '/',
    kicker: 'Back to',
    title: 'SpotSteer home',
    body: 'Prices, savings and the rest of the picture.',
  },
  {
    href: '/home-assistant',
    kicker: 'Other path',
    title: 'Home Assistant guide',
    body: 'Already running Home Assistant? Drive any device from there instead.',
  },
];

export function ShellyWizard() {
  const picker = useZonePicker();
  const { zoneCode, zone } = picker;

  const [mode, setMode] = useState<Mode>('relay');
  const [form, setForm] = useState<WizardForm>(INITIAL_FORM);
  const [copied, copyText, resetCopied] = useCopyToClipboard();

  const isRelay = mode === 'relay';
  const update = (patch: Partial<WizardForm>) => setForm((f) => ({ ...f, ...patch }));

  const generated = useMemo<Generated>(() => {
    if (!zoneCode) return null;
    const answers = {
      zoneCode,
      hours: form.hours,
      deadline: form.deadline,
      continuous: form.continuous,
      // Equal values mean "no window" to the script.
      unavailFrom: form.quiet ? form.quietFrom : 0,
      unavailTo: form.quiet ? form.quietTo : 0,
    };
    try {
      return { code: isRelay ? generateScheduleScript(answers) : generatePriceColorScript(answers) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Could not generate the script.' };
    }
  }, [isRelay, zoneCode, form]);

  const copy = () => {
    if (generated && 'code' in generated) copyText(generated.code);
  };

  const pickMode = (key: Mode) => {
    setMode(key);
    resetCopied();
  };

  const chips = isRelay
    ? [
        zone?.code ?? 'no zone',
        `${form.hours}h`,
        `by ${pad2(form.deadline)}:00`,
        form.continuous ? 'one block' : 'split',
      ]
    : [zone?.code ?? 'no zone', 'LED ring', 'read-only'];

  return (
    <Page>
      <div className="sb-guide">
        <GuideHero
          logo="/assets/logo-shelly.png"
          logoAlt="Shelly"
          title="Configure your Shelly"
          lede="Answer three questions. We write the script with your settings already inside it, you paste it into the device once, and from then on the Shelly runs on its own, cloud or no cloud."
          meta={['~3 minutes', 'Shelly Gen2 or newer', 'Nothing to install']}
        />
        <WizardQuestions mode={mode} onMode={pickMode} picker={picker} form={form} update={update} />
        <ScriptPanel mode={mode} generated={generated} chips={chips} copied={copied} onCopy={copy} />
        <InstallSteps />
        {isRelay && <OnDevicePanel />}
        <DayFlow />
        <GuideTroubleshooting items={TROUBLES} />
        <GuideNext links={NEXT} />
      </div>
    </Page>
  );
}
