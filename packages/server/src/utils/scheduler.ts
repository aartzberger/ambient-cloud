import axios from 'axios'
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

    try {
        const response = await axios.post(`${WORKER_URL}/schedule`, data)
    } catch (error) {
        console.log(error)
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
