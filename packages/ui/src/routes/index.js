import { useRoutes } from 'react-router-dom'

// routes
import LandingRoutes from './LandingRoutes'
import MainRoutes from './MainRoutes'
import CanvasRoutes from './CanvasRoutes'
import ChatbotRoutes from './ChatbotRoutes'
import config from 'config'

// ==============================|| ROUTING RENDER ||============================== //

export default function ThemeRoutes() {
    return useRoutes([LandingRoutes, MainRoutes, CanvasRoutes, ChatbotRoutes], config.basename)
}
