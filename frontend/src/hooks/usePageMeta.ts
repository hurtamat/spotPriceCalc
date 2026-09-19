import { useEffect } from 'react';
import { ROUTES, SITE } from '../config/site';

// One static index.html serves every route, so its title, description and canonical describe the
// landing page. Left alone, every sub-page would tell Google it is a duplicate of the home page.
const META: Record<string, { title: string; description: string }> = {
  [ROUTES.home]: {
    title: 'SpotSteer',
    description:
      'See the hourly spot price for your European bidding zone, and let SpotSteer run your EV charger, boiler and heat pump in the cheap hours. Works with Home Assistant and Shelly. No new hardware.',
  },
  [ROUTES.savings]: {
    title: 'Savings calculator — SpotSteer',
    description:
      'Estimate what spot-price automation saves your household over a year, and see the cheapest hour to run each appliance in your zone today.',
  },
  [ROUTES.shelly]: {
    title: 'Shelly spot price setup — SpotSteer',
    description:
      'Generate a ready-to-paste script for a Shelly plug or relay. It switches on during the cheapest hours of the day in your bidding zone.',
  },
  [ROUTES.homeAssistant]: {
    title: 'Home Assistant spot prices — SpotSteer',
    description:
      'Drive any device Home Assistant controls from day-ahead spot prices. Keep your supplier, keep your hardware, install the integration through HACS.',
  },
  [ROUTES.privacy]: {
    title: 'Privacy — SpotSteer',
    description: 'What personal data SpotSteer collects, why, and how to have it removed.',
  },
  [ROUTES.terms]: {
    title: 'Terms — SpotSteer',
    description: 'The terms of use for SpotSteer, including the limits of its price estimates.',
  },
  [ROUTES.contact]: {
    title: 'Contact — SpotSteer',
    description: 'How to reach SpotSteer, and who operates it.',
  },
};

function setAttr(selector: string, attr: string, value: string) {
  document.querySelector(selector)?.setAttribute(attr, value);
}

export function usePageMeta(path: string) {
  useEffect(() => {
    const meta = META[path];
    document.title = meta?.title ?? META[ROUTES.home].title;
    setAttr('meta[name="description"]', 'content', (meta ?? META[ROUTES.home]).description);
    // An unknown path renders the landing page, so it points there rather than at itself.
    setAttr('link[rel="canonical"]', 'href', SITE.origin + (meta ? path : ROUTES.home));
  }, [path]);
}
