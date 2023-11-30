import { useEffect, useState } from 'react'
import { PropTypes } from 'prop-types'
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Box } from '@mui/material'

// project imports
import { StyledButton } from 'ui-component/button/StyledButton'

function FeatureDialog({ dialogProps, isOpen, onClose }) {
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [image, setImage] = useState('')

    useEffect(() => {
        if (dialogProps) {
            setTitle(dialogProps.title || '')
            setContent(dialogProps.content || '')
            setImage(dialogProps.image || '')
        }
    }, [dialogProps])

    return (
        <>
            {dialogProps && (
                <Dialog open={isOpen} onClose={onClose}>
                    <DialogTitle variant='h1'>{title}</DialogTitle>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
                        <DialogContentText variant='h2' sx={{ marginRight: '20px' }}>
                            {content}
                        </DialogContentText>
                        <Box component={'img'} alt={''} src={image} borderRadius={'20px'} height={300} />
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
            )}
        </>
    )
}

FeatureDialog.propTypes = {
    dialogProps: PropTypes.object,
    isOpen: PropTypes.bool,
    onClose: PropTypes.func
}

export default FeatureDialog
