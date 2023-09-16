// material-ui
import { useTheme } from '@mui/material/styles'
import { useSelector } from 'react-redux'
import { Box } from '@mui/material'
import React, { useState } from 'react'

// ==============================|| IFRAME EMBED ||============================== //

const Stores = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    return (
        <>
            <Box
                sx={{
                    background: customization.isDarkMode ? theme.palette.common.black : '',
                    height: '100vh',
                    width: '100%',
                    display: 'flex', // to center the iframe
                    alignItems: 'top',
                    justifyContent: 'center'
                }}
            >
                <iframe
                    src={'https://client-ambient.ngrok.app/#/'}
                    style={{
                        borderRadius: '10px',
                        width: '100%',
                        height: '100%'
                    }}
                    title='Embedded Content'
                />
            </Box>
        </>
    )
}

Stores.propTypes = {}

export default Stores
