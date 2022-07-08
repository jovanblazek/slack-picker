import { App } from '@slack/bolt'
import cron from 'node-cron'
import ScheduledJobs from '../classes/ScheduledJobs'
import Log from './logger'
import { randomPicker } from './randomPicker'

export const scheduleCronJob = (
  { channelId, schedule }: { channelId: string; schedule: string },
  slackAppInstance: App
) => {
  const result = {
    channelId,
    schedule,
    cron: cron.schedule(
      schedule,
      () => {
        Log.info(`Running cron job for channelId ${channelId}`)
        try {
          void randomPicker({ channelId, slackAppInstance })
        } catch (error) {
          Log.error(error)
        }
      },
      {
        scheduled: true,
        timezone: 'Europe/Berlin',
      }
    ),
  }
  ScheduledJobs.getInstance().addJob(result)
}
