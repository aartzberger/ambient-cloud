import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from 'store/actions'

import { Box, Typography, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, OutlinedInput } from '@mui/material'
import { StyledButton } from 'ui-component/button/StyledButton'
import { TooltipWithParser } from 'ui-component/tooltip/TooltipWithParser'
import { Dropdown } from 'ui-component/dropdown/AutomationsDropdown'
import ConfirmDialog from 'ui-component/dialog/ConfirmDialog'
import { DarkCodeEditor } from 'ui-component/editor/DarkCodeEditor'
import { LightCodeEditor } from 'ui-component/editor/LightCodeEditor'
import { useTheme } from '@mui/material/styles'

// Icons
import { IconX, IconFileExport } from '@tabler/icons'

// API
import triggerApi from 'api/triggers'

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

const TriggerDialog = ({ show, dialogProps, onUseTemplate, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')
    const theme = useTheme()

    const customization = useSelector((state) => state.customization)
    const dispatch = useDispatch()

    // ==============================|| Snackbar ||============================== //

    useNotifier()
    const { confirm } = useConfirm()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const getSpecificTriggerApi = useApi(triggerApi.getSpecificTrigger)

    const [triggerId, setTriggerId] = useState('')
    const [triggerName, setTriggerName] = useState('')
    const [triggerType, setTriggerType] = useState('')
    const [triggerDesc, setTriggerDesc] = useState('')
    const [triggerIcon, setTriggerIcon] = useState('')
    const [triggerFunc, setTriggerFunc] = useState('')

    const triggerOptions = [
        { name: 'endpoint', label: 'Endpoint', description: 'send a GET request with {input} data' },
        { name: 'webhook', label: 'Webhook', description: 'Run when url requested (requires preprocessing logic)' },
        { name: 'interval', label: 'Interval', description: 'scheduled time interval in seconds (requires preprocessing logic)' }
    ]

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    useEffect(() => {
        if (getSpecificTriggerApi.data) {
            setTriggerId(getSpecificTriggerApi.data.id)
            setTriggerName(getSpecificTriggerApi.data.name)
            setTriggerDesc(getSpecificTriggerApi.data.description)
            if (getSpecificTriggerApi.data.func) setTriggerFunc(getSpecificTriggerApi.data.func)
            else setTriggerFunc('')
        }
    }, [getSpecificTriggerApi.data])

    useEffect(() => {
        if (dialogProps.type === 'EDIT' && dialogProps.data) {
            // When trigger dialog is opened from Triggers dashboard
            setTriggerId(dialogProps.data.id)
            setTriggerType(dialogProps.data.type)
            setTriggerName(dialogProps.data.name)
            setTriggerDesc(dialogProps.data.description)
            setTriggerIcon(dialogProps.data.iconSrc)
            if (dialogProps.data.func) setTriggerFunc(dialogProps.data.func)
            else setTriggerFunc('')
        } else if (dialogProps.type === 'IMPORT' && dialogProps.data) {
            // When trigger dialog is to import existing trigger
            setTriggerName(dialogProps.data.name)
            setTriggerType(dialogProps.data.type)
            setTriggerDesc(dialogProps.data.description)
            setTriggerIcon(dialogProps.data.iconSrc)
            if (dialogProps.data.func) setTriggerFunc(dialogProps.data.func)
            else setTriggerFunc('')
        } else if (dialogProps.type === 'TEMPLATE' && dialogProps.data) {
            // When trigger dialog is a template
            setTriggerName(dialogProps.data.name)
            setTriggerType(dialogProps.data.type)
            setTriggerDesc(dialogProps.data.description)
            setTriggerIcon(dialogProps.data.iconSrc)
            if (dialogProps.data.func) setTriggerFunc(dialogProps.data.func)
            else setTriggerFunc('')
        } else if (dialogProps.type === 'ADD') {
            // When trigger dialog is to add a new trigger
            setTriggerId('')
            setTriggerType('')
            setTriggerName('')
            setTriggerDesc('')
            setTriggerIcon('')
            setTriggerFunc('')
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    const useTriggerTemplate = () => {
        onUseTemplate(dialogProps.data)
    }

    // used for exporting a json version of the trigger
    const exportTrigger = async () => {
        try {
            const triggerResp = await triggerApi.getSpecificTrigger(triggerId)
            if (triggerResp.data) {
                const triggerData = triggerResp.data
                delete triggerData.id
                delete triggerData.createdDate
                delete triggerData.updatedDate
                let dataStr = JSON.stringify(triggerData)
                let dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

                let exportFileDefaultName = `${triggerName}-CustomTrigger.json`

                let linkElement = document.createElement('a')
                linkElement.setAttribute('href', dataUri)
                linkElement.setAttribute('download', exportFileDefaultName)
                linkElement.click()
            }
        } catch (error) {
            const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
            enqueueSnackbar({
                message: `Failed to export Trigger: ${errorData}`,
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

    // used for adding new trigge to the db
    const addNewTrigger = async () => {
        try {
            const obj = {
                name: triggerName,
                type: triggerType,
                description: triggerDesc,
                color: generateRandomGradient(),
                func: triggerFunc,
                iconSrc: triggerIcon
            }
            const createResp = await triggerApi.createNewTrigger(obj)
            if (createResp.data) {
                enqueueSnackbar({
                    message: 'New Trigger added',
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
                message: `Failed to add new Trigger: ${errorData}`,
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

    // used for saving the trigger to db
    const saveTrigger = async () => {
        try {
            const saveResp = await triggerApi.updateTrigger(triggerId, {
                name: triggerName,
                type: triggerType,
                description: triggerDesc,
                func: triggerFunc,
                iconSrc: triggerIcon
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Trigger saved',
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
                message: `Failed to save Trigger: ${errorData}`,
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

    // used for deleting the trigger from db
    const deleteTrigger = async () => {
        const confirmPayload = {
            title: `Delete Trigger`,
            description: `Delete Trigger ${triggerName}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                const delResp = await triggerApi.deleteTrigger(triggerId)
                if (delResp.data) {
                    enqueueSnackbar({
                        message: 'Trigger deleted',
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
                    message: `Failed to delete Trigger: ${errorData}`,
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

    const updateTriggerType = (type) => {
        setTriggerType(type)
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
                        <Button variant='outlined' onClick={() => exportTrigger()} startIcon={<IconFileExport />}>
                            Export
                        </Button>
                    )}
                </div>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            Trigger Name
                            <span style={{ color: 'red' }}>&nbsp;*</span>
                            <TooltipWithParser
                                style={{ marginLeft: 10 }}
                                title={'Trigger name must be small capital letter with underscore. Ex: my_trigger'}
                            />
                        </Typography>
                    </Stack>
                    <OutlinedInput
                        id='triggerName'
                        type='string'
                        fullWidth
                        disabled={dialogProps.type === 'TEMPLATE'}
                        placeholder='My New Trigger'
                        value={triggerName}
                        name='triggerName'
                        onChange={(e) => setTriggerName(e.target.value)}
                    />
                </Box>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            Trigger Type
                            <span style={{ color: 'red' }}>&nbsp;*</span>
                            <TooltipWithParser
                                style={{ marginLeft: 10 }}
                                title={
                                    'Triggers can be of type Interval or Webhook. Interval triggers are executed at a fixed interval. Webhook triggers are executed when a webhook is received.'
                                }
                            />
                        </Typography>
                    </Stack>
                    <Dropdown name={'Drop'} value={triggerType} options={triggerOptions} onSelect={updateTriggerType} disable={false} />
                </Box>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            Trigger description
                            <span style={{ color: 'red' }}>&nbsp;*</span>
                            <TooltipWithParser style={{ marginLeft: 10 }} title={'Description for the trigger'} />
                        </Typography>
                    </Stack>
                    <OutlinedInput
                        id='triggerDesc'
                        type='string'
                        fullWidth
                        disabled={dialogProps.type === 'TEMPLATE'}
                        placeholder='Description of what the trigger does.'
                        multiline={true}
                        rows={3}
                        value={triggerDesc}
                        name='triggerDesc'
                        onChange={(e) => setTriggerDesc(e.target.value)}
                    />
                </Box>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>Trigger Icon Src</Typography>
                    </Stack>
                    <OutlinedInput
                        id='triggerIcon'
                        type='string'
                        fullWidth
                        disabled={dialogProps.type === 'TEMPLATE'}
                        placeholder='https://raw.githubusercontent.com/gilbarbara/logos/main/logos/airtable.svg'
                        value={triggerIcon}
                        name='triggerIcon'
                        onChange={(e) => setTriggerIcon(e.target.value)}
                    />
                </Box>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            Preprocessing Javascript Function
                            <TooltipWithParser
                                style={{ marginLeft: 10 }}
                                title='Function call to execute before passing through LLM. Return value must be a string that can feed into a model.'
                            />
                        </Typography>
                    </Stack>
                    {dialogProps.type !== 'TEMPLATE' && (
                        <Button style={{ marginBottom: 10 }} variant='outlined' onClick={() => setTriggerFunc(exampleAPIFunc)}>
                            See Example
                        </Button>
                    )}
                    {customization.isDarkMode ? (
                        <DarkCodeEditor
                            value={triggerFunc}
                            disabled={dialogProps.type === 'TEMPLATE'}
                            onValueChange={(code) => setTriggerFunc(code)}
                            style={{
                                fontSize: '0.875rem',
                                minHeight: 'calc(100vh - 220px)',
                                width: '100%',
                                borderRadius: 5
                            }}
                        />
                    ) : (
                        <LightCodeEditor
                            value={triggerFunc}
                            disabled={dialogProps.type === 'TEMPLATE'}
                            onValueChange={(code) => setTriggerFunc(code)}
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
                    <StyledButton color='error' variant='contained' onClick={() => deleteTrigger()}>
                        Delete
                    </StyledButton>
                )}
                {dialogProps.type === 'TEMPLATE' && (
                    <StyledButton color='secondary' variant='contained' onClick={useTriggerTemplate}>
                        Use Template
                    </StyledButton>
                )}
                {dialogProps.type !== 'TEMPLATE' && (
                    <StyledButton
                        disabled={!(triggerName && triggerDesc && triggerType)}
                        variant='contained'
                        onClick={() => (dialogProps.type === 'ADD' || dialogProps.type === 'IMPORT' ? addNewTrigger() : saveTrigger())}
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

TriggerDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onUseTemplate: PropTypes.func,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default TriggerDialog
