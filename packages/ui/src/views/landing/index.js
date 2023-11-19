import 'reactflow/dist/style.css'
import { useEffect, useState } from 'react'

// material-ui
import { Toolbar, Box, AppBar } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import LandingHeader from './LandingHeader'
import LoginDialog from 'ui-component/dialog/LoginDialog'

// ==============================|| CANVAS ||============================== //

const Login = () => {
    const theme = useTheme()
    const [loginDialogOpen, setLoginDialogOpen] = useState(false)
    const [loginDialogProps, setLoginDialogProps] = useState({})

    useEffect(() => {
        setLoginDialogProps({
            title: 'Login',
            confirmButtonName: 'Login'
        })
    }, [])

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
                        <LandingHeader onClick={() => setLoginDialogOpen(true)} />
                    </Toolbar>
                </AppBar>
                <Box sx={{ pt: '70px', height: '100vh', width: '100%' }}>
                    <div className='login-parent-wrapper'>{/* Additional contente here */}</div>
                </Box>
            </Box>
            <LoginDialog show={loginDialogOpen} dialogProps={loginDialogProps} />
        </>
    )
}

export default Login
