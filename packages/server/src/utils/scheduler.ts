import axios from 'axios'
import logger from './logger'
import { Automation } from '../database/entities/Automation'

const WORKER_URL = process.env.WORKER_URL as string
const DEPLOYED_URL = process.env.DEPLOYED_URL as string

interface ScheduleArgs {
    interval: string
    url: string
    data?: {}
    timezone?: string
}

const scheduleInterval = async (data: ScheduleArgs) => {
    if (!WORKER_URL) {
        throw new Error('WORKER_URL is not defined')
    }

    let parts = data.url.split('/')
    let autoId = parts[parts.length - 1]

    try {
        const response = await axios.post(`${WORKER_URL}/schedule`, data)
        if (response.status === 200) {
            if (data.interval === '') {
                logger.info(`[server]: Automation ${autoId} interval revoked`)
            } else {
                logger.info(`[server]: Automation ${autoId} interval set to ${data.interval}`)
            }
        } else {
            logger.info(`[server]: Fauiled to schedule interval for automation ${autoId}`)
        }
    } catch (error) {
        logger.info(`[server]: Fauiled to schedule interval for automation ${autoId}`)
    }
}

export const handleAutomationInterval: any = async (auto: Automation) => {
    // if disabled, setting interval to 0 will revoke the schedule
    const interval = auto.enabled ? auto.interval : ''

    const args: ScheduleArgs = {
        url: `${DEPLOYED_URL}/api/v1/automations/run/${auto.url}`,
        interval: interval as string,
        data: {},
        timezone: auto.timeZone as string
    }
    await scheduleInterval(args)
}

export const removeAutomationInterval: any = async (auto: Automation) => {
    const args: ScheduleArgs = {
        url: `${DEPLOYED_URL}/api/v1/automations/run/${auto.url}`,
        interval: '',
        data: {},
        timezone: auto.timeZone as string
    }
    await scheduleInterval(args)
}
