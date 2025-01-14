import { lazy } from 'react'

// project imports
import MainLayout from 'layout/MainLayout'
import Loadable from 'ui-component/loading/Loadable'

// chatflows routing
const Chatflows = Loadable(lazy(() => import('views/chatflows')))

// marketplaces routing
const Marketplaces = Loadable(lazy(() => import('views/marketplaces')))

// apikey routing
const APIKey = Loadable(lazy(() => import('views/apikey')))

// tools routing
const Tools = Loadable(lazy(() => import('views/tools')))

// assistants routing
const Assistants = Loadable(lazy(() => import('views/assistants')))

// credentials routing
const Credentials = Loadable(lazy(() => import('views/credentials')))

// vectorstore routing
const Stores = Loadable(lazy(() => import('views/collections')))

// automations routing
const Customize = Loadable(lazy(() => import('views/customizations')))

// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
    path: '/',
    element: <MainLayout />,
    children: [
        {
            path: '/chatflows',
            element: <Chatflows />
        },
        {
            path: '/marketplaces',
            element: <Marketplaces />
        },
        {
            path: '/vectorstores',
            element: <Stores />
        },
        {
            path: '/customize',
            element: <Customize />
        },
        {
            path: '/apikey',
            element: <APIKey />
        },
        {
            path: '/tools',
            element: <Tools />
        },
        {
            path: '/assistants',
            element: <Assistants />
        },
        {
            path: '/credentials',
            element: <Credentials />
        }
    ]
}

export default MainRoutes
