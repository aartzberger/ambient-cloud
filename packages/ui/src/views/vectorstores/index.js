// material-ui
import { useTheme } from '@mui/material/styles'
import { useSelector } from 'react-redux'
import { Box } from '@mui/material'
import React, { useEffect } from 'react'

// API
import remotesApi from 'api/remotes'

// Hooks
import useApi from 'hooks/useApi'

// ==============================|| IFRAME EMBED ||============================== //

const Stores = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const getUserClientEndpointApi = useApi(remotesApi.getUserClientEndpoint)

    useEffect(() => {
        getUserClientEndpointApi.request()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getUserClientEndpointApi.error) {
            if (getUserClientEndpointApi.error?.response?.status === 401) {
                setLoginDialogProps({
                    title: 'Login',
                    confirmButtonName: 'Login'
                })
                setLoginDialogOpen(true)
            }
        }
    }, [getUserClientEndpointApi.error])

    useEffect(() => {
        if (getUserClientEndpointApi.data) {
            try {
                const userClientEndpoint = getUserClientEndpointApi.data.endpoint
            } catch (e) {
                console.error(e)
            }
        }
    }, [getUserClientEndpointApi.data])

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
                {' '}
                {getUserClientEndpointApi.data && (
                    <iframe
                        src={getUserClientEndpointApi.data.endpoint}
                        style={{
                            borderRadius: '10px',
                            width: '100%',
                            height: '100%'
                        }}
                        title='Embedded Content'
                    />
                )}
            </Box>
        </>
    )
}

Stores.propTypes = {}

export default Stores
