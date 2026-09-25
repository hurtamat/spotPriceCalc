export function StepRail({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <div className="sb-steps">
      {steps.map((s) => (
        <div key={s.title} className="sb-step">
          <span className="sb-step-node" aria-hidden="true" />
          <h3 className="sb-h4">{s.title}</h3>
          <p>{s.body}</p>
        </div>
      ))}
    </div>
  );
}
