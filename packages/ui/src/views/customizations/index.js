import { useEffect, useState, useRef, createElement } from 'react'
import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'

// material-ui
import { Grid, Box, Stack, Tabs, Tab, Button } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconTool, IconArrowBigRightLines, IconArrowBearRight2, IconPlus, IconFileImport } from '@tabler/icons'

// project imports
import MainCard from 'ui-component/cards/MainCard'
import ItemCard from 'ui-component/cards/ItemCard'
import { gridSpacing } from 'store/constant'
import WorkflowEmptySVG from 'assets/images/workflow_empty.svg'
import HandlerDialog from './HandlerDialog'
import TriggerDialog from './TriggerDialog'
import { StyledButton } from 'ui-component/button/StyledButton'
import ToolDialog from '../tools/ToolDialog'

// API
import handlersApi from 'api/automationhandlers'
import triggersApi from 'api/triggers'
import toolsApi from 'api/tools'

// Hooks
import useApi from 'hooks/useApi'

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

// ==============================|| Customization Builder ||============================== //

const Customize = () => {
    const inputRef = useRef(null)

    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const [isTriggersLoading, setTriggersLoading] = useState(true)
    const [isHandlersLoading, setHandlersLoading] = useState(true)
    const [isToolsLoading, setToolsLoading] = useState(true)
    const tabItems = ['Tools', 'Triggers', 'Handlers']
    const tabIcons = [IconTool, IconArrowBigRightLines, IconArrowBearRight2]
    const [value, setValue] = useState(0)

    // for triggers dialog
    const [showTriggerDialog, setShowTriggerDialog] = useState(false)
    const [triggerDialogProps, setTriggerlDialogProps] = useState({})
    // for handlers dialog
    const [showHandlerDialog, setShowHandlerDialog] = useState(false)
    const [handlerDialogProps, setHandlerDialogProps] = useState({})
    // for tools dialog
    const [showToolDialog, setShowToolDialog] = useState(false)
    const [toolDialogProps, setToolDialogProps] = useState({})

    const getAllTriggersApi = useApi(triggersApi.getAllTriggers)
    const getAllHandlersApi = useApi(handlersApi.getAllAutomationHandlers)
    const getAllToolsApi = useApi(toolsApi.getAllTools)

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
        } else if (tabItems[value] === 'Tools') {
            dialogProp.cancelButtonName = 'Cancel'
            dialogProp.confirmButtonName = 'Save'
            setToolDialogProps(dialogProp)
            setShowToolDialog(true)
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
        } else if (tabItems[value] === 'Tools') {
            dialogProp.cancelButtonName = 'Cancel'
            dialogProp.confirmButtonName = 'Add'
            setToolDialogProps(dialogProp)
            setShowToolDialog(true)
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

    useEffect(() => {
        getAllTriggersApi.request()
        getAllHandlersApi.request()
        getAllToolsApi.request()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setTriggersLoading(getAllTriggersApi.loading)
    }, [getAllTriggersApi.loading])

    useEffect(() => {
        setHandlersLoading(getAllHandlersApi.loading)
    }, [getAllHandlersApi.loading])

    useEffect(() => {
        setToolsLoading(getAllToolsApi.loading)
    }, [getAllToolsApi.loading])

    const edit = (name, data) => {
        const dialogProp = {
            title: `Edit ${name}`,
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            data: data
        }

        if (name === 'Trigger') {
            setTriggerlDialogProps(dialogProp)
            setShowTriggerDialog(true)
        } else if (name === 'Handler') {
            setHandlerDialogProps(dialogProp)
            setShowHandlerDialog(true)
        } else if (name === 'Tool') {
            setToolDialogProps(dialogProp)
            setShowToolDialog(true)
        }
    }

    const onConfirm = () => {
        setShowHandlerDialog(false)
        setShowTriggerDialog(false)
        setShowToolDialog(false)
        getAllTriggersApi.request()
        getAllHandlersApi.request()
        getAllToolsApi.request()
    }

    return (
        <>
            <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
                <Stack flexDirection='row'>
                    <h1>Custom Actions&nbsp;</h1>
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
                            icon={createElement(tabIcons[index])}
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
                                            <ItemCard data={data} onClick={() => edit('Trigger', data)} />
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
                                            <ItemCard data={data} onClick={() => edit('Handler', data)} />
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
                        {item === 'Tools' &&
                            !isToolsLoading &&
                            (getAllToolsApi.data && getAllToolsApi.data.length > 0 ? (
                                <Grid container spacing={gridSpacing}>
                                    {getAllToolsApi.data.map((data, index) => (
                                        <Grid key={index} item lg={3} md={4} sm={6} xs={12}>
                                            <ItemCard data={data} onClick={() => edit('Tool', data)} />
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
                                    <div>No Tools Yet</div>
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
            <ToolDialog
                show={showToolDialog}
                dialogProps={toolDialogProps}
                onCancel={() => setShowToolDialog(false)}
                onConfirm={onConfirm}
            ></ToolDialog>
        </>
    )
}

export default Customize
