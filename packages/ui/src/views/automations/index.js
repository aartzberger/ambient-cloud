import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'

// material-ui
import { Grid, Box, Stack, Tabs, Tab, Button } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconArrowBigRightLines, IconArrowBearRight2, IconPlus, IconFileImport } from '@tabler/icons'

// project imports
import MainCard from 'ui-component/cards/MainCard'
import ItemCard from 'ui-component/cards/ItemCard'
import { gridSpacing } from 'store/constant'
import WorkflowEmptySVG from 'assets/images/workflow_empty.svg'
import HandlerDialog from './HandlerDialog'
import TriggerDialog from './TriggerDialog'
import { StyledButton } from 'ui-component/button/StyledButton'

// API
import automationsApi from 'api/automations'
import handlersApi from 'api/automationhandlers'
import triggersApi from 'api/triggers'
import chatflowApi from 'api/chatflows'

// Hooks
import useApi from 'hooks/useApi'
import { set } from 'lodash'

function TabPanel(props) {
    const { children, value, index, ...other } = props
    return (
        <div
            role='tabpanel'
            hidden={value !== index}
            id={`attachment-tabpanel-${index}`}
            aria-labelledby={`attachment-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 1 }}>{children}</Box>}
        </div>
    )
}

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired
}

// ==============================|| Automation Builder ||============================== //

const Automations = () => {
    const navigate = useNavigate()
    const inputRef = useRef(null)

    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const [isTriggersLoading, setTriggersLoading] = useState(true)
    const [isHandlersLoading, setHandlersLoading] = useState(true)
    const [isAutomationsLoading, setAutomationsLoading] = useState(true)
    const [isChatflowsLoading, setChatflowsLoading] = useState(true)
    const tabItems = ['Triggers', 'Handlers']
    const [value, setValue] = useState(0)

    // keep track of all the returned data
    const [chatflowData, setChatflowData] = useState()
    const [handlerData, setHandlerData] = useState()
    const [triggerData, setTriggerData] = useState()

    // for triggers dialog
    const [showTriggerDialog, setShowTriggerDialog] = useState(false)
    const [triggerDialogProps, setTriggerlDialogProps] = useState({})
    // for handlers dialog
    const [showHandlerDialog, setShowHandlerDialog] = useState(false)
    const [handlerDialogProps, setHandlerDialogProps] = useState({})

    const getAllTriggersApi = useApi(triggersApi.getAllTriggers)
    const getAllHandlersApi = useApi(handlersApi.getAllAutomationHandlers)
    const getAllAutomationsApi = useApi(automationsApi.getAllAutomations)
    const getAllChatflowsApi = useApi(chatflowApi.getAllChatflows)

    const goToDialog = (selected) => {
        const dialogProp = {
            title: 'selected',
            type: 'ADD',
            data: selected
        }

        if (tabItems[value] === 'Triggers') {
            setTriggerlDialogProps(dialogProp)
            setShowTriggerDialog(true)
        } else if (tabItems[value] === 'Handlers') {
            setHandlerDialogProps(dialogProp)
            setShowHandlerDialog(true)
        }
    }

    const handleChange = (event, newValue) => {
        setValue(newValue)
    }

    const addNew = () => {
        const dialogProp = {
            title: `Add New ${tabItems[value]}`,
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add'
        }

        if (tabItems[value] === 'Triggers') {
            setTriggerlDialogProps(dialogProp)
            setShowTriggerDialog(true)
        } else if (tabItems[value] === 'Handlers') {
            setHandlerDialogProps(dialogProp)
            setShowHandlerDialog(true)
        }
    }

    const handleFileUpload = (e) => {
        if (!e.target.files) return

        const file = e.target.files[0]

        const reader = new FileReader()
        reader.onload = (evt) => {
            if (!evt?.target?.result) {
                return
            }
            const { result } = evt.target
            onUploadFile(result)
        }
        reader.readAsText(file)
    }

    const addLabel = (data) => {
        if (!data) return data // This will return early if data is null or undefined

        if (Array.isArray(data)) {
            data.forEach((item) => {
                item.label = item.name
            })
        }

        return data
    }

    useEffect(() => {
        getAllTriggersApi.request()
        getAllHandlersApi.request()
        getAllAutomationsApi.request()
        getAllChatflowsApi.request()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setAutomationsLoading(getAllAutomationsApi.loading)
    }, [getAllAutomationsApi.loading])

    useEffect(() => {
        setChatflowsLoading(getAllChatflowsApi.loading)
    }, [getAllChatflowsApi.loading])

    useEffect(() => {
        setTriggersLoading(getAllTriggersApi.loading)
    }, [getAllTriggersApi.loading])

    useEffect(() => {
        setHandlersLoading(getAllHandlersApi.loading)
    }, [getAllHandlersApi.loading])

    useEffect(() => {
        setChatflowData(addLabel(getAllChatflowsApi.data))
        setHandlerData(addLabel(getAllHandlersApi.data))
        setTriggerData(addLabel(getAllTriggersApi.data))
    }, [getAllHandlersApi.data, getAllTriggersApi.data, getAllChatflowsApi.data])

    const editTrigger = (selectedTrigger) => {
        const dialogProp = {
            title: 'Edit Trigger',
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            data: selectedTrigger
        }
        setTriggerlDialogProps(dialogProp)
        setShowTriggerDialog(true)
    }

    const editHandler = (selectedHandler) => {
        const dialogProp = {
            title: 'Edit Handler',
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            data: selectedHandler
        }
        setHandlerDialogProps(dialogProp)
        setShowHandlerDialog(true)
    }

    const onConfirm = () => {
        setShowHandlerDialog(false)
        setShowTriggerDialog(false)
        getAllAutomationsApi.request()
        getAllTriggersApi.request()
        getAllHandlersApi.request()
        getAllChatflowsApi.request()
    }

    return (
        <>
            <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
                <Stack flexDirection='row'>
                    <h1>Automation Builder&nbsp;</h1>
                    <Box sx={{ flexGrow: 1 }} />
                    <Box sx={{ mb: 1.25 }}>
                        <Button variant='outlined' sx={{ mr: 2 }} onClick={() => inputRef.current.click()} startIcon={<IconFileImport />}>
                            Load
                        </Button>
                        <input ref={inputRef} type='file' hidden accept='.json' onChange={(e) => handleFileUpload(e)} />
                        <StyledButton variant='contained' sx={{ color: 'white' }} onClick={addNew} startIcon={<IconPlus />}>
                            Create
                        </StyledButton>
                    </Box>
                </Stack>
                <Tabs sx={{ mb: 2 }} variant='fullWidth' value={value} onChange={handleChange} aria-label='tabs'>
                    {tabItems.map((item, index) => (
                        <Tab
                            key={index}
                            icon={index === 0 ? <IconArrowBigRightLines /> : <IconArrowBearRight2 />}
                            iconPosition='start'
                            label={<span style={{ fontSize: '1.1rem' }}>{item}</span>}
                        />
                    ))}
                </Tabs>
                {tabItems.map((item, index) => (
                    <TabPanel key={index} value={value} index={index}>
                        {item === 'Triggers' &&
                            !isTriggersLoading &&
                            (getAllTriggersApi.data && getAllTriggersApi.data.length > 0 ? (
                                <Grid container spacing={gridSpacing}>
                                    {getAllTriggersApi.data.map((data, index) => (
                                        <Grid key={index} item lg={3} md={4} sm={6} xs={12}>
                                            <ItemCard data={data} onClick={() => editTrigger(data)} />
                                        </Grid>
                                    ))}
                                </Grid>
                            ) : (
                                <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                    <Box sx={{ p: 2, height: 'auto' }}>
                                        <img
                                            style={{ objectFit: 'cover', height: '30vh', width: 'auto' }}
                                            src={WorkflowEmptySVG}
                                            alt='WorkflowEmptySVG'
                                        />
                                    </Box>
                                    <div>No Triggers Yet</div>
                                </Stack>
                            ))}
                        {item === 'Handlers' &&
                            !isHandlersLoading &&
                            (getAllHandlersApi.data && getAllHandlersApi.data.length > 0 ? (
                                <Grid container spacing={gridSpacing}>
                                    {getAllHandlersApi.data.map((data, index) => (
                                        <Grid key={index} item lg={3} md={4} sm={6} xs={12}>
                                            <ItemCard data={data} onClick={() => editHandler(data)} />
                                        </Grid>
                                    ))}
                                </Grid>
                            ) : (
                                <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                    <Box sx={{ p: 2, height: 'auto' }}>
                                        <img
                                            style={{ objectFit: 'cover', height: '30vh', width: 'auto' }}
                                            src={WorkflowEmptySVG}
                                            alt='WorkflowEmptySVG'
                                        />
                                    </Box>
                                    <div>No Handlers Yet</div>
                                </Stack>
                            ))}
                    </TabPanel>
                ))}
            </MainCard>

            <HandlerDialog
                show={showHandlerDialog}
                dialogProps={handlerDialogProps}
                onCancel={() => setShowHandlerDialog(false)}
                onConfirm={onConfirm}
                onUseTemplate={(selected) => goToDialog(selected)}
            ></HandlerDialog>
            <TriggerDialog
                show={showTriggerDialog}
                dialogProps={triggerDialogProps}
                onCancel={() => setShowTriggerDialog(false)}
                onConfirm={onConfirm}
                onUseTemplate={(selected) => goToDialog(selected)}
            ></TriggerDialog>
        </>
    )
}

export default Automations
