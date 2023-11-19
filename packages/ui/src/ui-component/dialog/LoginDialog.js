import { createPortal } from 'react-dom'
import { useState } from 'react'
import PropTypes from 'prop-types'
import { Dialog, DialogContent, Typography, DialogTitle, Button, ButtonBase } from '@mui/material'
import { StyledButton } from 'ui-component/button/StyledButton'
import { Input } from 'ui-component/input/Input'
import GoogleImage from 'assets/images/google-login-white.png'

// API
import authApi from '../../api/auth'

const LoginDialog = ({ show, dialogProps }) => {
    const portalElement = document.getElementById('portal')
    const nameInput = {
        label: 'Name',
        name: 'name',
        type: 'string'
    }
    const emailInput = {
        label: 'Email',
        name: 'email',
        type: 'string'
    }
    const passwordInput = {
        label: 'Password',
        name: 'password',
        type: 'password'
    }
    const [nameVal, setNameVal] = useState('')
    const [emailVal, setEmailVal] = useState('')
    const [passwordVal, setPasswordVal] = useState('')
    const [showSignUp, setShowSignUp] = useState(false)

    const onLoginClick = async (name, email, password) => {
        const userInto = {
            name,
            email,
            password
        }

        const response = await authApi.loginUser(userInto)

        if (response.status === 200) {
            window.location.href = '/chatflows'
        }
    }

    const onGoogleLogin = () => {
        // Redirects user to the Google OAuth endpoint for authentication
        window.location.href = '/auth/google'
    }

    const component = show ? (
        <Dialog
            onKeyUp={async (e) => {
                if (e.key === 'Enter') {
                    await onLoginClick(nameVal, emailVal, passwordVal)
                }
            }}
            open={show}
            fullWidth
            maxWidth='xs'
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                {dialogProps.title}
            </DialogTitle>
            <DialogContent>
                {showSignUp && (
                    <>
                        <Typography>Name</Typography>
                        <Input inputParam={nameInput} onChange={(newValue) => setNameVal(newValue)} value={setNameVal} showDialog={false} />
                        <div style={{ marginTop: 20 }}></div>
                    </>
                )}
                <Typography>Email</Typography>
                <Input inputParam={emailInput} onChange={(newValue) => setEmailVal(newValue)} value={emailVal} />
                <div style={{ marginTop: 20 }}></div>
                <Typography>Password</Typography>
                <Input inputParam={passwordInput} onChange={(newValue) => setPasswordVal(newValue)} value={passwordVal} />
                <div style={{ marginTop: 20 }}></div>
                <ButtonBase onClick={() => setShowSignUp(!showSignUp)} style={{ padding: 0, minWidth: 'auto' }}>
                    <Typography component='span' sx={{ textDecoration: 'underline', cursor: 'pointer' }}>
                        {showSignUp ? 'Login' : 'Sign Up'}
                    </Typography>
                </ButtonBase>
                <div style={{ marginTop: 20 }}></div>
                <StyledButton variant='contained' fullWidth onClick={async () => await onLoginClick(nameVal, emailVal, passwordVal)}>
                    {showSignUp ? 'Sign Up' : 'Login'}
                </StyledButton>
                {/* Divider Line */}
                <div style={{ margin: '20px 0', borderTop: '1px solid #e0e0e0' }}></div> {/* Adjust the margin and color as needed */}
                {/* Google Login Button */}
                <div style={{ marginTop: 20 }}>
                    <Button
                        variant='contained'
                        fullWidth
                        onClick={onGoogleLogin}
                        sx={{
                            padding: 0,
                            background: 'none',
                            '&:hover': {
                                background: 'none'
                            }
                        }}
                    >
                        <img src={GoogleImage} alt='Login with Google' style={{ width: '80%', height: 'auto' }} />
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

LoginDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object
}

export default LoginDialog
