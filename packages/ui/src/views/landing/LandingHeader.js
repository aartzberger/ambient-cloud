import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useEffect, useRef, useState } from 'react'

// material-ui
import { useTheme } from '@mui/material/styles'
import { Avatar, Box, ButtonBase } from '@mui/material'

// icons
import { IconLogin } from '@tabler/icons'

// ==============================|| CANVAS HEADER ||============================== //

const CanvasHeader = () => {
    const theme = useTheme()

    const handleLogin = () => {
        // Redirects user to the Google OAuth endpoint for authentication
        window.location.href = '/auth/google'
    }

    return (
        <>
            <Box sx={{ flexGrow: 1 }}>{/* additional elements here */}</Box>
            <Box>
                <ButtonBase title='Back' sx={{ borderRadius: '50%' }}>
                    <Avatar
                        variant='rounded'
                        sx={{
                            ...theme.typography.commonAvatar,
                            ...theme.typography.mediumAvatar,
                            transition: 'all .2s ease-in-out',
                            background: theme.palette.secondary.light,
                            color: theme.palette.secondary.dark,
                            '&:hover': {
                                background: theme.palette.secondary.dark,
                                color: theme.palette.secondary.light
                            }
                        }}
                        color='inherit'
                        onClick={handleLogin}
                    >
                        <IconLogin stroke={1.5} size='1.3rem' />
                    </Avatar>
                </ButtonBase>
            </Box>
        </>
    )
}

export default CanvasHeader
