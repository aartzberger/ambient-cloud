// assets
import { IconHierarchy, IconTemplate, IconKey, IconTool, IconLock, IconSettingsAutomation, IconDatabase, IconRobot } from '@tabler/icons'

// constant
const icons = { IconHierarchy, IconTemplate, IconKey, IconTool, IconLock, IconSettingsAutomation, IconDatabase, IconRobot }

// ==============================|| DASHBOARD MENU ITEMS ||============================== //

const dashboard = {
    id: 'dashboard',
    title: '',
    type: 'group',
    children: [
        {
            id: 'chatflows',
            title: 'Models',
            type: 'item',
            url: '/chatflows',
            icon: icons.IconHierarchy,
            breadcrumbs: true
        },
        // {
        //     id: 'tools',
        //     title: 'Tools',
        //     type: 'item',
        //     url: '/tools',
        //     icon: icons.IconTool,
        //     breadcrumbs: true
        // },
        {
            id: 'vectorstores',
            title: 'Collections',
            type: 'item',
            url: '/vectorstores',
            icon: icons.IconDatabase,
            breadcrumbs: true
        },
        {
            id: 'customize',
            title: 'Custom Actions',
            type: 'item',
            url: '/customize',
            icon: icons.IconSettingsAutomation,
            breadcrumbs: true
        },
        // {
        //     id: 'marketplaces',
        //     title: 'Templates',
        //     type: 'item',
        //     url: '/marketplaces',
        //     icon: icons.IconTemplate,
        //     breadcrumbs: true
        // },
        {
            id: 'assistants',
            title: 'Assistants',
            type: 'item',
            url: '/assistants',
            icon: icons.IconRobot,
            breadcrumbs: true
        },
        {
            id: 'credentials',
            title: 'Credentials',
            type: 'item',
            url: '/credentials',
            icon: icons.IconLock,
            breadcrumbs: true
        },
        {
            id: 'apikey',
            title: 'API Keys',
            type: 'item',
            url: '/apikey',
            icon: icons.IconKey,
            breadcrumbs: true
        }
    ]
}

export default dashboard
