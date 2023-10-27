import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

// Material
import { TextField } from '@mui/material'

// API
import remotesApi from 'api/remotes'

export const MilvusUrlHandler = ({ name, onChange, value, disabled = false }) => {
    const [url, setUrl] = useState([])

    useEffect(() => {
        const getUserClientEndpointApi = async () => {
            try {
                const data = await remotesApi.getUserClientEndpoint()
                setUrl(data)
            } catch (e) {
                console.error(e)
            }
        }

        getUserClientEndpointApi()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <>
            <TextField id={name} onChange={onChange} disabled={disabled} value={url ? url : value} defaultValue={value} />
        </>
    )
}

MilvusUrlHandler.propTypes = {
    name: PropTypes.string,
    disabled: PropTypes.bool,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onChange: PropTypes.func
}
