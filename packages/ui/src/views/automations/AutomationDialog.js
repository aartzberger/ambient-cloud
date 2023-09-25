import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from 'store/actions'

import { Box, Typography, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, OutlinedInput } from '@mui/material'
import { StyledButton } from 'ui-component/button/StyledButton'
import { TooltipWithParser } from 'ui-component/tooltip/TooltipWithParser'
import ConfirmDialog from 'ui-component/dialog/ConfirmDialog'
import { Dropdown } from 'ui-component/dropdown/AutomationsDropdown'
import { nanoid } from 'nanoid'
import { baseURL } from 'store/constant'
import { Input } from 'ui-component/input/Input'

// Icons
import { IconX, IconFileExport } from '@tabler/icons'

// API
import automationApi from 'api/automations'

// Hooks
import useConfirm from 'hooks/useConfirm'
import useApi from 'hooks/useApi'

// utils
import useNotifier from 'utils/useNotifier'
import { generateRandomGradient } from 'utils/genericHelper'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from 'store/actions'
import { set, update } from 'lodash'

const AutomationDialog = ({ show, dialogProps, onUseTemplate, onCancel, onConfirm, chatflows, triggers, handlers }) => {
    const portalElement = document.getElementById('portal')

    const dispatch = useDispatch()

    // ==============================|| Snackbar ||============================== //

    useNotifier()
    const { confirm } = useConfirm()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const getSpecificAutomationApi = useApi(automationApi.getSpecificAutomation)

    const [automationId, setAutomationId] = useState('')
    const [automationName, setAutomationName] = useState('')
    const [automationDesc, setAutomationDesc] = useState('')
    const [automationIcon, setAutomationIcon] = useState('')
    const [automationChatflowId, setAutomationChatflowId] = useState('')
    const [automationTriggerId, setAutomationTriggerId] = useState('')
    const [automationHandlerId, setAutomationHandlerId] = useState('')
    const [automationChatflowName, setAutomationChatflowName] = useState('')
    const [automationTriggerName, setAutomationTriggerName] = useState('')
    const [automationHandlerName, setAutomationHandlerName] = useState('')
    const [selectedTriggerType, setSelectedTriggerType] = useState('')

    const [automationInterval, setAutomationInterval] = useState()
    const [automationUrl, setAutomationUrl] = useState('')

    const makeUniqueUrl = () => {
        const uniqueId = nanoid()
        const url = uniqueId
        return url
    }

    const triggerTypeFromId = (id) => {
        const object = triggers.find((item) => item.id === id)
        return object ? object.type : 'null'
    }

    const updateChatflow = (id) => {
        const object = chatflows.find((item) => item.id === id)
        setAutomationChatflowName(object ? object.name : 'null')
        setAutomationChatflowId(id)
    }

    const updateTrigger = (id) => {
        const object = triggers.find((item) => item.id === id)
        setAutomationTriggerName(object ? object.name : 'null')
        setSelectedTriggerType(object ? object.type : 'null')
        setAutomationTriggerId(id)
    }

    const updateHandler = (id) => {
        const object = handlers.find((item) => item.id === id)
        setAutomationHandlerName(object ? object.name : 'null')
        setAutomationHandlerId(id)
    }

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const nameFromId = (data, id) => {
        const object = data.find((item) => item.id === id)
        return object ? object.name : 'null'
    }

    useEffect(() => {
        if (getSpecificAutomationApi.data) {
            setAutomationId(getSpecificAutomationApi.data.id)
            setAutomationName(getSpecificAutomationApi.data.name)
            setAutomationDesc(getSpecificAutomationApi.data.description)
            setAutomationChatflowId(getSpecificAutomationApi.data.chatflowid)
            setAutomationTriggerId(getSpecificAutomationApi.data.triggerid)
            setAutomationHandlerId(getSpecificAutomationApi.data.handlerid)
            setAutomationChatflowName(nameFromId(chatflows, getSpecificAutomationApi.data.chatflowid))
            setAutomationTriggerName(nameFromId(triggers, getSpecificAutomationApi.data.triggerid))
            setAutomationHandlerName(nameFromId(handlers, getSpecificAutomationApi.data.handlerid))
            setAutomationInterval(getSpecificAutomationApi.data.interval)
            setAutomationUrl(getSpecificAutomationApi.data.url)
            setSelectedTriggerType(triggerTypeFromId(getSpecificAutomationApi.data.triggerid))
        }
    }, [getSpecificAutomationApi.data])

    useEffect(() => {
        if (dialogProps.type === 'EDIT' && dialogProps.data) {
            // When automation dialog is opened from automations dashboard
            setAutomationId(dialogProps.data.id)
            setAutomationName(dialogProps.data.name)
            setAutomationDesc(dialogProps.data.description)
            setAutomationIcon(dialogProps.data.iconSrc)
            setAutomationChatflowId(dialogProps.data.chatflowid)
            setAutomationTriggerId(dialogProps.data.triggerid)
            setAutomationHandlerId(dialogProps.data.handlerid)
            setAutomationChatflowName(nameFromId(chatflows, dialogProps.data.chatflowid))
            setAutomationTriggerName(nameFromId(triggers, dialogProps.data.triggerid))
            setAutomationHandlerName(nameFromId(handlers, dialogProps.data.handlerid))
            setAutomationTriggerId(dialogProps.data.triggerid)
            setAutomationUrl(dialogProps.data.url)
            setSelectedTriggerType(triggerTypeFromId(dialogProps.data.triggerid))
        } else if (dialogProps.type === 'ADD') {
            // When automation dialog is to add a new automation
            setAutomationId('')
            setAutomationName('')
            setAutomationDesc('')
            setAutomationIcon('')
            setAutomationChatflowId('')
            setAutomationTriggerId('')
            setAutomationHandlerId('')
            setAutomationChatflowName('')
            setAutomationTriggerName('')
            setAutomationHandlerName('')
            setAutomationInterval('')
            setAutomationUrl(makeUniqueUrl())
            setSelectedTriggerType('')
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    const useAutomationTemplate = () => {
        onUseTemplate(dialogProps.data)
    }

    // used for exporting a json version of the automation
    const exportAutomation = async () => {
        try {
            const automationResp = await automationApi.getSpecificAutomation(automationId)
            if (automationResp.data) {
                const automationData = automationResp.data
                delete automationData.id
                delete automationData.createdDate
                delete automationData.updatedDate
                let dataStr = JSON.stringify(automationData)
                let dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

                let exportFileDefaultName = `${automationName}-CustomAutomation.json`

                let linkElement = document.createElement('a')
                linkElement.setAttribute('href', dataUri)
                linkElement.setAttribute('download', exportFileDefaultName)
                linkElement.click()
            }
        } catch (error) {
            const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
            enqueueSnackbar({
                message: `Failed to export Automation: ${errorData}`,
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

    // used for adding new automation to the db
    const addNewAutomation = async () => {
        try {
            const obj = {
                name: automationName,
                description: automationDesc,
                color: generateRandomGradient(),
                iconSrc: automationIcon,
                chatflowid: automationChatflowId,
                triggerid: automationTriggerId,
                handlerid: automationHandlerId,
                interval: automationInterval,
                url: automationUrl
            }
            const createResp = await automationApi.createNewAutomation(obj)
            if (createResp.data) {
                enqueueSnackbar({
                    message: 'New Automation added',
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
                message: `Failed to add new Automation: ${errorData}`,
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

    // used for saving the automation to db
    const saveAutomation = async () => {
        try {
            const saveResp = await automationApi.updateAutomation(automationId, {
                name: automationName,
                description: automationDesc,
                iconSrc: automationIcon,
                chatflowid: automationChatflowId,
                triggerid: automationTriggerId,
                handlerid: automationHandlerId,
                interval: automationInterval,
                url: automationUrl
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Automation saved',
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
                message: `Failed to save Automation: ${errorData}`,
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

    // used for deleting the Automation from db
    const deleteAutomation = async () => {
        const confirmPayload = {
            title: `Delete Automation`,
            description: `Delete Automation ${automationName}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                const delResp = await automationApi.deleteAutomation(automationId)
                if (delResp.data) {
                    enqueueSnackbar({
                        message: 'Automation deleted',
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
                    message: `Failed to delete Automation: ${errorData}`,
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
                        <Button variant='outlined' onClick={() => exportAutomation()} startIcon={<IconFileExport />}>
                            Export
                        </Button>
                    )}
                </div>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            Automation Name
                            <span style={{ color: 'red' }}>&nbsp;*</span>
                            <TooltipWithParser
                                style={{ marginLeft: 10 }}
                                title={'Automation name must be small capital letter with underscore. Ex: my_automation'}
                            />
                        </Typography>
                    </Stack>
                    <OutlinedInput
                        id='automationName'
                        type='string'
                        fullWidth
                        disabled={dialogProps.type === 'TEMPLATE'}
                        placeholder='My New Automation'
                        value={automationName}
                        name='automationName'
                        onChange={(e) => setAutomationName(e.target.value)}
                    />
                </Box>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            Automation description
                            <span style={{ color: 'red' }}>&nbsp;*</span>
                            <TooltipWithParser style={{ marginLeft: 10 }} title={'Description for the Automation'} />
                        </Typography>
                    </Stack>
                    <OutlinedInput
                        id='automationDesc'
                        type='string'
                        fullWidth
                        disabled={dialogProps.type === 'TEMPLATE'}
                        placeholder='Description of what the Automation does.'
                        multiline={true}
                        rows={3}
                        value={automationDesc}
                        name='automationDesc'
                        onChange={(e) => setAutomationDesc(e.target.value)}
                    />
                </Box>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>Automation Icon Src</Typography>
                    </Stack>
                    <OutlinedInput
                        id='automationIcon'
                        type='string'
                        fullWidth
                        disabled={dialogProps.type === 'TEMPLATE'}
                        placeholder='https://raw.githubusercontent.com/gilbarbara/logos/main/logos/airtable.svg'
                        value={automationIcon}
                        name='automationIcon'
                        onChange={(e) => setAutomationIcon(e.target.value)}
                    />
                </Box>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            Select a Trigger
                            <span style={{ color: 'red' }}>&nbsp;*</span>
                            <TooltipWithParser style={{ marginLeft: 10 }} title={'This is what will trigger the process to start,'} />
                        </Typography>
                    </Stack>
                    <Dropdown
                        name={'triggers'}
                        value={automationTriggerName}
                        options={triggers}
                        onSelect={updateTrigger}
                        disable={false}
                        useId={true}
                        addLabel={true}
                    />
                    <Box sx={{ display: selectedTriggerType === 'interval' ? 'block' : 'none', width: '25%' }}>
                        <Input
                            data={{}}
                            inputParam={{ name: 'interval-input', type: 'number', placeholder: 'Interval in minutes' }}
                            onChange={setAutomationInterval}
                            value={automationInterval}
                        />
                    </Box>
                    <Box sx={{ p: 2, display: selectedTriggerType === 'endpoint' || selectedTriggerType === 'webhook' ? 'block' : 'none' }}>
                        <Typography>
                            {'Trigger Url: ' + baseURL + '/api/v1/automations/run/' + automationUrl}
                            <br />
                            {'Method: POST'}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            Seletect a Flow
                            <span style={{ color: 'red' }}>&nbsp;*</span>
                            <TooltipWithParser
                                style={{ marginLeft: 10 }}
                                title={'This is the model that will be used for language processing'}
                            />
                        </Typography>
                    </Stack>
                    <Dropdown
                        name={'chatflows'}
                        value={automationChatflowName}
                        options={chatflows}
                        onSelect={updateChatflow}
                        disable={false}
                        useId={true}
                        addLabel={true}
                    />
                </Box>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            Seletect a Handler
                            <span style={{ color: 'red' }}>&nbsp;*</span>
                            <TooltipWithParser
                                style={{ marginLeft: 10 }}
                                title={'After the model runs, this will handle what happens next.'}
                            />
                        </Typography>
                    </Stack>
                    <Dropdown
                        name={'handlers'}
                        value={automationHandlerName}
                        options={handlers}
                        onSelect={updateHandler}
                        disable={false}
                        useId={true}
                        addLabel={true}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                {dialogProps.type === 'EDIT' && (
                    <StyledButton color='error' variant='contained' onClick={() => deleteAutomation()}>
                        Delete
                    </StyledButton>
                )}
                {dialogProps.type === 'TEMPLATE' && (
                    <StyledButton color='secondary' variant='contained' onClick={useAutomationTemplate}>
                        Use Template
                    </StyledButton>
                )}
                {dialogProps.type !== 'TEMPLATE' && (
                    <StyledButton
                        disabled={!(automationName && automationDesc && automationChatflowId && automationTriggerId && automationHandlerId)}
                        variant='contained'
                        onClick={() =>
                            dialogProps.type === 'ADD' || dialogProps.type === 'IMPORT' ? addNewAutomation() : saveAutomation()
                        }
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

AutomationDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onUseTemplate: PropTypes.func,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func,
    chatflows: PropTypes.object,
    triggers: PropTypes.object,
    handlers: PropTypes.object
}

export default AutomationDialog
