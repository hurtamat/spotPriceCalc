export function TariffComparison() {
  return (
    <div className="sb-tariffs">
      <div className="sb-tariff sb-tariff-dynamic">
        <h4 className="sb-h4">Dynamic / spot tariff</h4>
        <p>
          You pay the real hourly price. Now moving flexible loads into the cheap hours{' '}
          <strong>directly cuts your bill</strong>, and that&apos;s exactly what SpotSteer
          automates.
        </p>
      </div>
      <div className="sb-tariff sb-tariff-fixed">
        <h4 className="sb-h4">Fixed tariff</h4>
        <p>
          You pay the same rate at any hour. Shifting your boiler or EV charging to cheap hours
          saves you <strong>nothing</strong>, because the meter can&apos;t tell the difference.
        </p>
      </div>
    </div>
  );
}
