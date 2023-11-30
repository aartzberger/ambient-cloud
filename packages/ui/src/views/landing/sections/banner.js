import { PropTypes } from 'prop-types'
import { Box, Typography } from '@mui/material'
import { StyledButton } from 'ui-component/button/StyledButton'
import { IconInfoSquareRounded, IconCalendar } from '@tabler/icons'

// project imports
import { LandingStyles } from './styles'
import SectionHeader from 'ui-component/section/section-header'
import { PixelGrid } from 'ui-component/pixelGrid/pixelGrid'
import { scheduleLink } from 'store/constant'

function scrollToElement(elementId, duration) {
    const element = document.getElementById(elementId)
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
    }
}

export default function Banner({ onInquire, onVideoClick }) {
    return (
        <>
            <Box
                position={'relative'}
                sx={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
                id='home'
            >
                <Box sx={LandingStyles.pixelGridContainer}>
                    <PixelGrid />
                </Box>
                <Box sx={LandingStyles.contentContainer}>
                    <SectionHeader isWhite={true} title='Your gateway to intelligent applications' />
                    <Typography sx={{ pb: '50px', fontSize: '24px', color: 'white', textAlign: 'center' }}>
                        Rapidly build and instantly deploy AI solutions.
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                        {/* TODO CMAN - Add when video is ready */}
                        {/* <StyledButton
                            type='submit'
                            variant='contained'
                            color='secondary'
                            sx={{ pointerEvents: 'auto', color: 'black', fontSize: '24px', padding: '10px 20px', borderRadius: '30px' }}
                            startIcon={<IconDeviceTv />}
                            onClick={() => {
                                onVideoClick()
                            }}
                        >
                            Watch the Demo
                        </StyledButton> */}
                        <StyledButton
                            type='submit'
                            variant='contained'
                            color='secondary'
                            sx={{ pointerEvents: 'auto', color: 'black', fontSize: '24px', padding: '10px 20px', borderRadius: '30px' }}
                            startIcon={<IconCalendar />}
                            onClick={() => (window.location.href = scheduleLink)}
                        >
                            Schedule a Demo
                        </StyledButton>
                        <StyledButton
                            type='submit'
                            variant='contained'
                            color='secondary'
                            sx={{ pointerEvents: 'auto', color: 'black', fontSize: '24px', padding: '10px 20px', borderRadius: '30px' }}
                            startIcon={<IconInfoSquareRounded />}
                            onClick={() => onInquire()}
                        >
                            Contact Us
                        </StyledButton>
                    </Box>
                </Box>
            </Box>
        </>
    )
}

Banner.propTypes = {
    onInquire: PropTypes.func,
    onVideoClick: PropTypes.func
}
