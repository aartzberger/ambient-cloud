import 'reactflow/dist/style.css'

// material-ui
import { Toolbar, Box, AppBar } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import LandingHeader from './LandingHeader'

// ==============================|| CANVAS ||============================== //

const Login = () => {
    const theme = useTheme()

    return (
        <>
            <Box>
                <AppBar
                    enableColorOnDark
                    position='fixed'
                    color='inherit'
                    elevation={1}
                    sx={{
                        bgcolor: theme.palette.background.default
                    }}
                >
                    <Toolbar>
                        <LandingHeader />
                    </Toolbar>
                </AppBar>
                <Box sx={{ pt: '70px', height: '100vh', width: '100%' }}>
                    <div className='login-parent-wrapper'>{/* Additional contente here */}</div>
                </Box>
            </Box>
        </>
    )
}

export default Login
