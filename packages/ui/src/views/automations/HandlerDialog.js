import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from 'store/actions'

import { Box, Typography, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, OutlinedInput } from '@mui/material'
import { StyledButton } from 'ui-component/button/StyledButton'
import { TooltipWithParser } from 'ui-component/tooltip/TooltipWithParser'
import ConfirmDialog from 'ui-component/dialog/ConfirmDialog'
import { DarkCodeEditor } from 'ui-component/editor/DarkCodeEditor'
import { LightCodeEditor } from 'ui-component/editor/LightCodeEditor'
import { useTheme } from '@mui/material/styles'

// Icons
import { IconX, IconFileExport } from '@tabler/icons'

// API
import handlerApi from 'api/automationhandlers'

// Hooks
import useConfirm from 'hooks/useConfirm'
import useApi from 'hooks/useApi'

// utils
import useNotifier from 'utils/useNotifier'
import { generateRandomGradient } from 'utils/genericHelper'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from 'store/actions'

const exampleAPIFunc = `/*
* You can use any libraries imported in AmbientWare
* Must return a string value at the end of function
*/

const fetch = require('node-fetch');
const url = 'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true';
const options = {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};
try {
    const response = await fetch(url, options);
    const text = await response.text();
    return text;
} catch (error) {
    console.error(error);
    return '';
}`

const HandlerDialog = ({ show, dialogProps, onUseTemplate, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')
    const theme = useTheme()

    const customization = useSelector((state) => state.customization)
    const dispatch = useDispatch()

    // ==============================|| Snackbar ||============================== //

    useNotifier()
    const { confirm } = useConfirm()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const getSpecificHandlerApi = useApi(handlerApi.getSpecificAutomationHandler)

    const [handlerId, setHandlerId] = useState('')
    const [handlerName, setHandlerName] = useState('')
    const [handlerDesc, setHandlerDesc] = useState('')
    const [handlerIcon, setHandlerIcon] = useState('')
    const [handlerFunc, setHandlerFunc] = useState('')

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    useEffect(() => {
        if (getSpecificHandlerApi.data) {
            setHandlerId(getSpecificHandlerApi.data.id)
            setHandlerName(getSpecificHandlerApi.data.name)
            setHandlerDesc(getSpecificHandlerApi.data.description)
            if (getSpecificHandlerApi.data.func) setHandlerFunc(getSpecificHandlerApi.data.func)
            else setHandlerFunc('')
        }
    }, [getSpecificHandlerApi.data])

    useEffect(() => {
        if (dialogProps.type === 'EDIT' && dialogProps.data) {
            // When handler dialog is opened from Handlers dashboard
            setHandlerId(dialogProps.data.id)
            setHandlerName(dialogProps.data.name)
            setHandlerDesc(dialogProps.data.description)
            setHandlerIcon(dialogProps.data.iconSrc)
            if (dialogProps.data.func) setHandlerFunc(dialogProps.data.func)
            else setHandlerFunc('')
        } else if (dialogProps.type === 'IMPORT' && dialogProps.data) {
            // When handler dialog is to import existing handler
            setHandlerName(dialogProps.data.name)
            setHandlerDesc(dialogProps.data.description)
            setHandlerIcon(dialogProps.data.iconSrc)
            if (dialogProps.data.func) setHandlerFunc(dialogProps.data.func)
            else setHandlerFunc('')
        } else if (dialogProps.type === 'TEMPLATE' && dialogProps.data) {
            // When handler dialog is a template
            setHandlerName(dialogProps.data.name)
            setHandlerDesc(dialogProps.data.description)
            setHandlerIcon(dialogProps.data.iconSrc)
            if (dialogProps.data.func) setHandlerFunc(dialogProps.data.func)
            else setHandlerFunc('')
        } else if (dialogProps.type === 'ADD') {
            // When handler dialog is to add a new handler
            setHandlerId('')
            setHandlerName('')
            setHandlerDesc('')
            setHandlerIcon('')
            setHandlerFunc('')
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    const useHandlerTemplate = () => {
        onUseTemplate(dialogProps.data)
    }

    // used for exporting a json version of the handler
    const exportHandler = async () => {
        try {
            const handlerResp = await handlerApi.getSpecificAutomationHandler(handlerId)
            if (handlerResp.data) {
                const handlerData = handlerResp.data
                delete handlerData.id
                delete handlerData.createdDate
                delete handlerData.updatedDate
                let dataStr = JSON.stringify(handlerData)
                let dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

                let exportFileDefaultName = `${handlerName}-CustomHandler.json`

                let linkElement = document.createElement('a')
                linkElement.setAttribute('href', dataUri)
                linkElement.setAttribute('download', exportFileDefaultName)
                linkElement.click()
            }
        } catch (error) {
            const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
            enqueueSnackbar({
                message: `Failed to export Handler: ${errorData}`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
            onCancel()
        }
    }

    // used for adding new handler to the db
    const addNewHandler = async () => {
        try {
            const obj = {
                name: handlerName,
                description: handlerDesc,
                color: generateRandomGradient(),
                func: handlerFunc,
                iconSrc: handlerIcon
            }
            const createResp = await handlerApi.createNewAutomationHandler(obj)
            if (createResp.data) {
                enqueueSnackbar({
                    message: 'New Handler added',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'success',
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
                onConfirm(createResp.data.id)
            }
        } catch (error) {
            const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
            enqueueSnackbar({
                message: `Failed to add new Handler: ${errorData}`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
            onCancel()
        }
    }

    // used for saving the Handler to db
    const saveHandler = async () => {
        try {
            const saveResp = await handlerApi.updateAutomationHandler(handlerId, {
                name: handlerName,
                description: handlerDesc,
                func: handlerFunc,
                iconSrc: handlerIcon
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Handler saved',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'success',
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
                onConfirm(saveResp.data.id)
            }
        } catch (error) {
            console.error(error)
            const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
            enqueueSnackbar({
                message: `Failed to save Handler: ${errorData}`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
            onCancel()
        }
    }

    // used for deleting the Handler from db
    const deleteHandler = async () => {
        const confirmPayload = {
            title: `Delete Handler`,
            description: `Delete Handler ${handlerName}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                const delResp = await handlerApi.deleteAutomationHandler(handlerId)
                if (delResp.data) {
                    enqueueSnackbar({
                        message: 'Handler deleted',
                        options: {
                            key: new Date().getTime() + Math.random(),
                            variant: 'success',
                            action: (key) => (
                                <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                    <IconX />
                                </Button>
                            )
                        }
                    })
                    onConfirm()
                }
            } catch (error) {
                const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
                enqueueSnackbar({
                    message: `Failed to delete Handler: ${errorData}`,
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'error',
                        persist: true,
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
                onCancel()
            }
        }
    }

    const component = show ? (
        <Dialog
            fullWidth
            maxWidth='md'
            open={show}
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    {dialogProps.title}
                    <div style={{ flex: 1 }} />
                    {dialogProps.type === 'EDIT' && (
                        <Button variant='outlined' onClick={() => exportHandler()} startIcon={<IconFileExport />}>
                            Export
                        </Button>
                    )}
                </div>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            Handler Name
                            <span style={{ color: 'red' }}>&nbsp;*</span>
                            <TooltipWithParser
                                style={{ marginLeft: 10 }}
                                title={'Handler name must be small capital letter with underscore. Ex: my_Handler'}
                            />
                        </Typography>
                    </Stack>
                    <OutlinedInput
                        id='handlerName'
                        type='string'
                        fullWidth
                        disabled={dialogProps.type === 'TEMPLATE'}
                        placeholder='My New Handler'
                        value={handlerName}
                        name='handlerName'
                        onChange={(e) => setHandlerName(e.target.value)}
                    />
                </Box>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            Handler description
                            <span style={{ color: 'red' }}>&nbsp;*</span>
                            <TooltipWithParser style={{ marginLeft: 10 }} title={'Description for the Handler'} />
                        </Typography>
                    </Stack>
                    <OutlinedInput
                        id='handlerDesc'
                        type='string'
                        fullWidth
                        disabled={dialogProps.type === 'TEMPLATE'}
                        placeholder='Description of what the Handler does.'
                        multiline={true}
                        rows={3}
                        value={handlerDesc}
                        name='handlerDesc'
                        onChange={(e) => setHandlerDesc(e.target.value)}
                    />
                </Box>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>Handler Icon Src</Typography>
                    </Stack>
                    <OutlinedInput
                        id='handlerIcon'
                        type='string'
                        fullWidth
                        disabled={dialogProps.type === 'TEMPLATE'}
                        placeholder='https://raw.githubusercontent.com/gilbarbara/logos/main/logos/airtable.svg'
                        value={handlerIcon}
                        name='handlerIcon'
                        onChange={(e) => setHandlerIcon(e.target.value)}
                    />
                </Box>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            Preprocessing Javascript Function
                            <TooltipWithParser
                                style={{ marginLeft: 10 }}
                                title='Function call to execute after passing through LLM. Do with the data as you please!'
                            />
                        </Typography>
                    </Stack>
                    {dialogProps.type !== 'TEMPLATE' && (
                        <Button style={{ marginBottom: 10 }} variant='outlined' onClick={() => setHandlerFunc(exampleAPIFunc)}>
                            See Example
                        </Button>
                    )}
                    {customization.isDarkMode ? (
                        <DarkCodeEditor
                            value={handlerFunc}
                            disabled={dialogProps.type === 'TEMPLATE'}
                            onValueChange={(code) => setHandlerFunc(code)}
                            style={{
                                fontSize: '0.875rem',
                                minHeight: 'calc(100vh - 220px)',
                                width: '100%',
                                borderRadius: 5
                            }}
                        />
                    ) : (
                        <LightCodeEditor
                            value={handlerFunc}
                            disabled={dialogProps.type === 'TEMPLATE'}
                            onValueChange={(code) => setHandlerFunc(code)}
                            style={{
                                fontSize: '0.875rem',
                                minHeight: 'calc(100vh - 220px)',
                                width: '100%',
                                border: `1px solid ${theme.palette.grey[300]}`,
                                borderRadius: 5
                            }}
                        />
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                {dialogProps.type === 'EDIT' && (
                    <StyledButton color='error' variant='contained' onClick={() => deleteHandler()}>
                        Delete
                    </StyledButton>
                )}
                {dialogProps.type === 'TEMPLATE' && (
                    <StyledButton color='secondary' variant='contained' onClick={useHandlerTemplate}>
                        Use Template
                    </StyledButton>
                )}
                {dialogProps.type !== 'TEMPLATE' && (
                    <StyledButton
                        disabled={!(handlerName && handlerDesc)}
                        variant='contained'
                        onClick={() => (dialogProps.type === 'ADD' || dialogProps.type === 'IMPORT' ? addNewHandler() : saveHandler())}
                    >
                        {dialogProps.confirmButtonName}
                    </StyledButton>
                )}
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

HandlerDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onUseTemplate: PropTypes.func,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default HandlerDialog
