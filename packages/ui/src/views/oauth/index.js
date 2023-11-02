import { useParams } from 'react-router'
import { Box, Typography, Button } from '@mui/material'

const OauthComplete = () => {
    let { status } = useParams()

    const handleClose = () => {
        // Communicate to the main window (if any)
        if (window.opener) {
            window.opener.postMessage('authorizationCompleted', '*')
        }
        // Close the popup window
        window.close()
    }

    return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant='h6'>{status === 'success' ? 'Authorization Complete!' : 'Authorization Failed'}</Typography>
            <Typography variant='body1' sx={{ my: 2 }}>
                Please close this window or click the button below.
            </Typography>
            <Button color='primary' variant='contained' onClick={handleClose}>
                Close Window
            </Button>
        </Box>
    )
}

export default OauthComplete
