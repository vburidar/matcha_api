import { CronJob } from 'cron';

function computeMatchingRatio() {
  console.log('compute matching ratio');
}

const matchingRatioJob = new CronJob(
  '0 0 */1 * * *', // cronTime every hour at 0min 0sec
  computeMatchingRatio, // onTick
  null, // onComplete
  false, // start
  'Europe/Paris', // timezone
  null, // context
  false, // runOnInit
);

export default matchingRatioJob;
