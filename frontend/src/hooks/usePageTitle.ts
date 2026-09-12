import { useEffect } from 'react';

/**
 * The browser tab is a label, not a sentence. The landing page shows the brand on its
 * own; every other route shows the brand plus where you are, so a row of open tabs
 * stays tellable apart.
 *
 * The page description that search engines want lives in the `description` meta tag
 * in index.html, not here.
 */
const TITLES: Record<string, string> = {
  '/': 'SpotSteer',
  '/savings': 'SpotSteer · Savings',
  '/shelly': 'SpotSteer · Shelly',
  '/home-assistant': 'SpotSteer · Home Assistant',
  '/privacy': 'SpotSteer · Privacy',
  '/terms': 'SpotSteer · Terms',
};

export function usePageTitle(path: string) {
  useEffect(() => {
    document.title = TITLES[path] ?? 'SpotSteer';
  }, [path]);
}
