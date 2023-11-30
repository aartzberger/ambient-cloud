import { PropTypes } from 'prop-types'
import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

export default function SectionHeader({ title, isWhite }) {
    const theme = useTheme()

    return (
        <Box sx={{ pb: '45px', textAlign: 'center' }}>
            <Typography sx={{ fontSize: '86px', fontWeight: 'bold', color: isWhite ? 'white' : 'black' }}>{title}</Typography>
        </Box>
    )
}

SectionHeader.propTypes = {
    title: PropTypes.string.isRequired,
    isWhite: PropTypes.bool
}
