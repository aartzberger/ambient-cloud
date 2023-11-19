// material-ui
import { useTheme } from '@mui/material/styles'
import { Box, ButtonBase } from '@mui/material'
import { StyledButton } from 'ui-component/button/StyledButton'

// icons
import { IconLogin } from '@tabler/icons'

// ==============================|| CANVAS HEADER ||============================== //

const LandingHeader = ({ onClick, onCancel }) => {
    const theme = useTheme()

    return (
        <>
            <Box sx={{ flexGrow: 1 }}>{/* additional elements here */}</Box>
            <Box>
                <ButtonBase title='Back' sx={{ borderRadius: '50%' }}>
                    <StyledButton variant='contained' sx={{ color: 'white' }} onClick={onClick} startIcon={<IconLogin />}>
                        Login / Signup
                    </StyledButton>
                </ButtonBase>
            </Box>
        </>
    )
}

LandingHeader.propTypes = {
    onClick: PropTypes.func,
    onCancel: PropTypes.func
}

export default LandingHeader
