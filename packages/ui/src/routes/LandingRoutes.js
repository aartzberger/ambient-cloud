import { lazy } from 'react'

// project imports
import MinimalLayout from 'layout/MinimalLayout'
import Loadable from 'ui-component/loading/Loadable'

// login routing
const Landing = Loadable(lazy(() => import('views/landing')))

const LandingRoutes = {
    path: '/',
    element: <MinimalLayout />,
    children: [
        {
            path: '/',
            element: <Landing />
        },
        {
            path: '/login',
            element: <Landing />
        }
    ]
}

export default LandingRoutes
