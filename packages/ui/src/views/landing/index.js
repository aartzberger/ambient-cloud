import 'reactflow/dist/style.css'
import { useEffect, useState } from 'react'

// material-ui
import { Toolbar, Box, AppBar } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import LandingHeader from './LandingHeader'
import LoginDialog from 'ui-component/dialog/LoginDialog'
import InquireDialog from 'ui-component/dialog/InquireDialog'
import FeatureDialog from './FeatureDialog'
import SubscriptionDialog from 'ui-component/dialog/SubscriptionDialog'
import CoreFeature0 from './sections/coreFeature0'
import Integrations from './sections/Integrations'
import Banner from './sections/banner'

// ==============================|| LANDING PAGE ||============================== //

const Login = () => {
    const theme = useTheme()
    const [loginDialogOpen, setLoginDialogOpen] = useState(false)
    const [loginDialogProps, setLoginDialogProps] = useState({})
    const [inquireDialogOpen, setInquireDialogOpen] = useState(false)
    const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false)
    const [featureDialogOpen, setFeatureDialogOpen] = useState(false)
    const [featureDialogProps, setFeatureDialogProps] = useState({})

    const openFeatureDialog = (props) => {
        setFeatureDialogProps(props)
        setFeatureDialogOpen(true)
    }

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
                        <LandingHeader
                            onLogin={() => setLoginDialogOpen(true)}
                            onPricing={() => {
                                setSubscriptionDialogOpen(true)
                            }}
                        />
                    </Toolbar>
                </AppBar>
                <Box sx={{ height: '100vh', width: '100%' }}>
                    <Box sx={{ height: 'calc(100vh - 70px' }}>
                        <Banner
                            onInquire={() => setInquireDialogOpen(true)}
                            onVideoClick={() => {
                                setSubscriptionDialogOpen(true)
                            }}
                        />
                    </Box>

                    <CoreFeature0 />

                    <Integrations openFeatureDialog={openFeatureDialog} />
                </Box>
            </Box>
            <LoginDialog
                show={loginDialogOpen}
                dialogProps={loginDialogProps}
                onClose={() => {
                    setLoginDialogOpen(false)
                }}
            />
            <InquireDialog isOpen={inquireDialogOpen} onClose={() => setInquireDialogOpen(false)} />
            <SubscriptionDialog
                show={subscriptionDialogOpen}
                onCancel={() => {
                    setSubscriptionDialogOpen(false)
                }}
            />
            <FeatureDialog
                dialogProps={featureDialogProps}
                isOpen={featureDialogOpen}
                onClose={() => {
                    setFeatureDialogOpen(false)
                }}
            />
        </>
    )
}

export default Login
