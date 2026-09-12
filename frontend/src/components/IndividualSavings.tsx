// "Individual savings": one card per flexible appliance, showing when it would start.
// The scheduling and savings math isn't implemented yet, see `planAppliance`.
import { useMemo } from 'react';
import { DAY_LABELS, dateForDay } from '../api/spotPrices';
import { buildDaySlots, type PriceSlot } from './PriceBarChart';
import { useSelection } from '../state/selectionStore';

interface Appliance {
  key: string;
  name: string;
  kw: number;
  /** Hours the load needs to run, as a contiguous block. */
  hours: number;
  /** Material Symbols ligature name, must also be in index.html's icon_names=. */
  icon: string;
}

interface Plan {
  /** "HH:MM" local start of the chosen window. */
  startTime: string | null;
  midPriceCt: number | null;
  savingEur: number | null;
}

const UNKNOWN: Plan = { startTime: null, midPriceCt: null, savingEur: null };

/** TODO(math): pick the start hour and price the saving. */
function planAppliance(_slots: PriceSlot[], _appliance: Appliance): Plan {
  return UNKNOWN;
}

const APPLIANCES: Appliance[] = [
  { key: 'ev', name: 'Electric car', kw: 7.2, hours: 4, icon: 'electric_car' },
  { key: 'washer', name: 'Washing machine', kw: 2, hours: 2, icon: 'local_laundry_service' },
  { key: 'boiler', name: 'Electric boiler', kw: 2, hours: 2, icon: 'water_heater' },
  { key: 'heatpump', name: 'Heat pump', kw: 3.5, hours: 3, icon: 'heat_pump' },
  { key: 'dishwasher', name: 'Dishwasher', kw: 1.8, hours: 2, icon: 'dishwasher' },
  { key: 'dryer', name: 'Dryer', kw: 2.5, hours: 2, icon: 'cool_to_dry' },
];

export function IndividualSavings() {
  const { day, zoneName, data } = useSelection();

  // Slice the zone's own local day, same as the chart.
  const slots = useMemo(() => {
    if (!data || data.points.length === 0) return null;
    const built = buildDaySlots(data.points, data.timeZoneId, dateForDay(day));
    return built.length > 0 ? built : null;
  }, [data, day]);

  const plans = useMemo(
    () => APPLIANCES.map((a) => ({ appliance: a, plan: slots ? planAppliance(slots, a) : UNKNOWN })),
    [slots],
  );

  const eur = (v: number) => `€${v.toFixed(2)}`;
  const ct = (v: number) => `${v.toFixed(1)} c/kWh`;

  return (
    <section className="sb-indiv" id="individual-savings">
      <div className="sb-indiv-head">
        <h3>Individual savings</h3>
        <span>
          Suggested start time and saving vs. the evening peak, for {zoneName} on{' '}
          {DAY_LABELS[day].toLowerCase()}
        </span>
      </div>

      <div className="sb-indiv-grid">
        {plans.map(({ appliance, plan }) => (
          <div
            className="sb-card sb-indiv-card"
            key={appliance.key}
            data-pending={plan.startTime == null || undefined}
          >
            <div className="sb-indiv-top">
              <span className="sb-indiv-icon">
                <span className="material-symbols-outlined" aria-hidden="true">
                  {appliance.icon}
                </span>
              </span>
              <div className="sb-indiv-title">
                <div className="sb-indiv-name">{appliance.name}</div>
                <div className="sb-indiv-spec">
                  {appliance.kw} kW for {appliance.hours} h
                </div>
              </div>
              {plan.startTime != null && (
                <div className="sb-indiv-when">
                  <div className="sb-indiv-cap">Turn on at</div>
                  <div className="sb-indiv-time">{plan.startTime}</div>
                </div>
              )}
            </div>

            {/* One honest pending line rather than a row of empty value slots: the
                scheduler is not wired up yet, and three blank fields per card would
                read as a loading failure. */}
            {plan.midPriceCt == null || plan.savingEur == null ? (
              <div className="sb-indiv-pending">
                Needs a {appliance.hours} h block. Timing arrives when the scheduler goes live.
              </div>
            ) : (
              <div className="sb-indiv-foot">
                <div>
                  <div className="sb-indiv-detail">
                    Run {appliance.hours} h ({appliance.kw * appliance.hours} kWh)
                  </div>
                  <div className="sb-indiv-mid">
                    <strong>{ct(plan.midPriceCt)}</strong> mid price
                  </div>
                </div>
                <div className="sb-indiv-saving-box">
                  <div className="sb-indiv-cap">Saving vs. peak</div>
                  <div className="sb-indiv-saving">{eur(plan.savingEur)}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
