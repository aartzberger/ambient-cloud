import { PropTypes } from 'prop-types'
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Link } from '@mui/material'

// project imports
import { StyledButton } from 'ui-component/button/StyledButton'

function InquireDialog({ isOpen, onClose }) {
    return (
        <Dialog open={isOpen} onClose={onClose}>
            <DialogTitle variant='h1'>Inquiry</DialogTitle>
            <DialogContent sx={{ display: 'flex', justifyContent: 'center' }}>
                <DialogContentText variant='h2'>
                    AmbientWare software is currently undergoing Beta testing! If interested, please email us at{' '}
                    <Link href='mailto:info@ambientware.co' target='_blank' rel='noopener noreferrer'>
                        info@ambientware.co
                    </Link>
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <StyledButton
                    type='submit'
                    variant='contained'
                    color='primary'
                    onClick={() => {
                        onClose()
                    }}
                >
                    Close
                </StyledButton>
            </DialogActions>
        </Dialog>
    )
}

InquireDialog.propTypes = {
    isOpen: PropTypes.bool,
    onClose: PropTypes.func
}

export default InquireDialog
