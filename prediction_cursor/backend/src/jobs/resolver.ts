import cron from 'node-cron';
import { checkAndResolveMarkets } from '../services/resolutionService';

/**
 * Start the resolution scheduler
 * Runs every minute to check for markets that need resolution
 */
export function startResolutionScheduler() {
  console.log('[Scheduler] Starting resolution scheduler...');

  // Run every minute
  cron.schedule('* * * * *', async () => {
    console.log(`[Scheduler] Running resolution check at ${new Date().toISOString()}`);
    
    try {
      await checkAndResolveMarkets();
    } catch (error) {
      console.error('[Scheduler] Error during resolution check:', error);
    }
  });

  console.log('[Scheduler] Resolution scheduler started - checking every minute');
}

/**
 * Manually trigger a resolution check (useful for testing)
 */
export async function triggerResolutionCheck() {
  console.log('[Scheduler] Manual resolution check triggered');
  await checkAndResolveMarkets();
}
