import axios from 'axios'
import { Automation } from '../database/entities/Automation'

const WORKER_URL = process.env.WORKER_URL as string
const DEPLOYED_URL = process.env.DEPLOYED_URL as string

interface ScheduleArgs {
    interval: number
    url: string
    data?: {}
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
    if (Number(auto.interval) > 0 && auto.enabled) {
        const args: ScheduleArgs = {
            url: `${DEPLOYED_URL}/api/v1/automations/run/${auto.url}`,
            interval: Number(auto.interval),
            data: {}
        }
        await scheduleInterval(args)
    }
}

export const shouldUpdateInterval = async (auto: Automation) => {
    // this url is used to check if the automation is running. it serves an id
    const url = `${DEPLOYED_URL}/api/v1/automations/run/${auto.url}`

    try {
        const response = await axios.get(`${WORKER_URL}/status`, { params: { url: url } })
        if (response.data?.status) {
            // if the automation is running, don't update the interval
            // the interval automation will be blocked in processAutomation function if disabled
            return false
        } else {
            // if it is not running, update the interval
            return true
        }
    } catch (error) {
        console.log(error)
        return false
    }
}
