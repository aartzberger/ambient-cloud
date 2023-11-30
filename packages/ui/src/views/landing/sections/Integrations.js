import { PropTypes } from 'prop-types'
import { Container, Grid, Typography, Box, Divider } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import FeatureCardColumn from 'ui-component/featureCard/feature-card-column'
import Integration from '../../../assets/images/key-feature/integration.png'
import Customize from '../../../assets/images/key-feature/customize.png'
import Automation from '../../../assets/images/key-feature/automation.png'
import Analytics from '../../../assets/images/key-feature/analytics.png'
import Scalable from '../../../assets/images/key-feature/scalable.png'
import { LandingStyles } from './styles'

const data = [
    {
        id: 1,
        imgSrc: Integration,
        altText: 'SEAMLESS INTEGRATION',
        title: 'SEAMLESS INTEGRATION',
        text: 'Effortlessly connect with your systems and data.'
    },
    {
        id: 2,
        imgSrc: Customize,
        altText: 'Customizable AI Solutions',
        title: 'CUSTOMIZABLE AI SOLUTIONS',
        text: 'Tailor-made AI to meet your specific use cases.'
    }
]

const data2 = [
    {
        id: 3,
        imgSrc: Automation,
        altText: 'ADVANCED TASK AUTOMATION',
        title: 'ADVANCED TASK AUTOMATION',
        text: 'Streamline operations with intelligent automation.'
    },
    {
        id: 4,
        imgSrc: Analytics,
        altText: 'REAL-TIME ANALYTICS',
        title: 'REAL-TIME ANALYTICS',
        text: 'Integreates with industry leading analytics platforms to provide real-time insights.'
    },
    {
        id: 5,
        imgSrc: Scalable,
        altText: 'SCALABLE AND RELIABLE',
        title: 'SCALABLE AND RELIABLE',
        text: 'Grow your AI workforce as your business expands.'
    }
]

export default function Integrations({ openFeatureDialog }) {
    const theme = useTheme()

    return (
        <Box
            display={'grid'}
            sx={{
                alignContent: 'center',
                justifyContent: 'center',
                backgroundColor: theme.palette.grey[900]
            }}
            id='whyus'
        >
            <Divider sx={{ m: 10, borderWidth: 2, width: '90%', borderColor: 'grey' }} />
            <Container sx={{ justifyContent: 'center' }}>
                <Typography sx={{ width: '60%', color: 'white', fontWeight: 'bold', fontSize: '48px', textAlign: 'center', mx: 'auto' }}>
                    Develop, deploy, and manage AI agents with modern tools
                </Typography>
            </Container>
            <Container maxWidth={'mone'} sx={{ width: '90%' }}>
                <Grid sx={LandingStyles.grid}>
                    {data.map((item) => (
                        <FeatureCardColumn openDialog={openFeatureDialog} key={item.id} dialogProps={item} />
                    ))}
                </Grid>
                <Grid sx={LandingStyles.grid}>
                    {data2.map((item) => (
                        <FeatureCardColumn openDialog={openFeatureDialog} key={item.id} dialogProps={item} />
                    ))}
                </Grid>
            </Container>

            <Divider sx={{ m: 10, borderWidth: 2, width: '90%', borderColor: 'grey' }} />
        </Box>
    )
}

Integrations.propTypes = {
    openFeatureDialog: PropTypes.func
}
