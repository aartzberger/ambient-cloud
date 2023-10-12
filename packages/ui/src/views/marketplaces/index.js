import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import PropTypes from 'prop-types'

// material-ui
import { Grid, Box, Stack, Tabs, Tab } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { IconHierarchy, IconTool, IconArrowBigRightLines, IconArrowBearRight2 } from '@tabler/icons'

// project imports
import MainCard from 'ui-component/cards/MainCard'
import ItemCard from 'ui-component/cards/ItemCard'
import { gridSpacing } from 'store/constant'
import WorkflowEmptySVG from 'assets/images/workflow_empty.svg'
import ToolDialog from 'views/tools/ToolDialog'
import TriggerDialog from 'views/automations/TriggerDialog'
import HandlerDialog from 'views/automations/HandlerDialog'

// API
import marketplacesApi from 'api/marketplaces'

// Hooks
import useApi from 'hooks/useApi'

// const
import { baseURL } from 'store/constant'

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

// ==============================|| Marketplace ||============================== //

const Marketplace = () => {
    const navigate = useNavigate()

    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const [isChatflowsLoading, setChatflowsLoading] = useState(true)
    const [isToolsLoading, setToolsLoading] = useState(true)
    const [isTriggersLoading, setTriggersLoading] = useState(true)
    const [isHandlersLoading, setHandlersLoading] = useState(true)
    const [images, setImages] = useState({})
    const tabItems = ['Models', 'Tools', 'Triggers', 'Handlers']
    const [value, setValue] = useState(0)
    const [showToolDialog, setShowToolDialog] = useState(false)
    const [toolDialogProps, setToolDialogProps] = useState({})

    const [showTriggerDialog, setShowTriggerDialog] = useState(false)
    const [triggerDialogProps, setTriggerDialogProps] = useState({})

    const [showHandlerDialog, setShowHandlerDialog] = useState(false)
    const [handlerDialogProps, setHandlerDialogProps] = useState({})

    const getAllChatflowsMarketplacesApi = useApi(marketplacesApi.getAllChatflowsMarketplaces)
    const getAllToolsMarketplacesApi = useApi(marketplacesApi.getAllToolsMarketplaces)
    const getAllTriggersMarketplacesApi = useApi(marketplacesApi.getAllTriggersMarketplaces)
    const getAllHandlersMarketplacesApi = useApi(marketplacesApi.getAllHandlersMarketplaces)

    const onUseTemplate = (selected, type) => {
        const dialogProp = {
            title: `Add New ${type}`,
            type: 'IMPORT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add',
            data: selected
        }
        if (type === 'Tool') {
            setToolDialogProps(dialogProp)
            setShowToolDialog(true)
        } else if (type === 'Trigger') {
            setTriggerDialogProps(dialogProp)
            setShowTriggerDialog(true)
        } else if (type === 'Handler') {
            setHandlerDialogProps(dialogProp)
            setShowHandlerDialog(true)
        }
    }

    const goToTool = (selectedTool) => {
        const dialogProp = {
            title: selectedTool.templateName,
            type: 'TEMPLATE',
            data: selectedTool
        }
        setToolDialogProps(dialogProp)
        setShowToolDialog(true)
    }

    const goToTrigger = (selectedTrigger) => {
        const dialogProp = {
            title: selectedTrigger.templateName,
            type: 'TEMPLATE',
            data: selectedTrigger
        }
        setTriggerDialogProps(dialogProp)
        setShowTriggerDialog(true)
    }

    const goToHandler = (selectedHandler) => {
        const dialogProp = {
            title: selectedHandler.templateName,
            type: 'TEMPLATE',
            data: selectedHandler
        }
        setHandlerDialogProps(dialogProp)
        setShowHandlerDialog(true)
    }

    const goToCanvas = (selectedChatflow) => {
        navigate(`/marketplace/${selectedChatflow.id}`, { state: selectedChatflow })
    }

    const handleChange = (event, newValue) => {
        setValue(newValue)
    }

    const getIcon = (index) => {
        if (index === 0) {
            return <IconHierarchy />
        } else if (index === 1) {
            return <IconTool />
        } else if (index === 2) {
            return <IconArrowBigRightLines />
        } else if (index === 3) {
            return <IconArrowBearRight2 />
        }
    }

    useEffect(() => {
        getAllChatflowsMarketplacesApi.request()
        getAllToolsMarketplacesApi.request()
        getAllTriggersMarketplacesApi.request()
        getAllHandlersMarketplacesApi.request()

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setChatflowsLoading(getAllChatflowsMarketplacesApi.loading)
    }, [getAllChatflowsMarketplacesApi.loading])

    useEffect(() => {
        setToolsLoading(getAllToolsMarketplacesApi.loading)
    }, [getAllToolsMarketplacesApi.loading])

    useEffect(() => {
        setTriggersLoading(getAllTriggersMarketplacesApi.loading)
    }, [getAllTriggersMarketplacesApi.loading])

    useEffect(() => {
        setHandlersLoading(getAllHandlersMarketplacesApi.loading)
    }, [getAllHandlersMarketplacesApi.loading])

    useEffect(() => {
        if (getAllChatflowsMarketplacesApi.data) {
            try {
                const chatflows = getAllChatflowsMarketplacesApi.data
                const images = {}
                for (let i = 0; i < chatflows.length; i += 1) {
                    const flowDataStr = chatflows[i].flowData
                    const flowData = JSON.parse(flowDataStr)
                    const nodes = flowData.nodes || []
                    images[chatflows[i].id] = []
                    for (let j = 0; j < nodes.length; j += 1) {
                        const imageSrc = `${baseURL}/api/v1/node-icon/${nodes[j].data.name}`
                        if (!images[chatflows[i].id].includes(imageSrc)) {
                            images[chatflows[i].id].push(imageSrc)
                        }
                    }
                }
                setImages(images)
            } catch (e) {
                console.error(e)
            }
        }
    }, [getAllChatflowsMarketplacesApi.data])

    return (
        <>
            <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
                <Stack flexDirection='row'>
                    <h1>Templates</h1>
                </Stack>
                <Tabs sx={{ mb: 2 }} variant='fullWidth' value={value} onChange={handleChange} aria-label='tabs'>
                    {tabItems.map((item, index) => (
                        <Tab
                            key={index}
                            icon={getIcon(index)}
                            iconPosition='start'
                            label={<span style={{ fontSize: '1.1rem' }}>{item}</span>}
                        />
                    ))}
                </Tabs>
                {tabItems.map((item, index) => (
                    <TabPanel key={index} value={value} index={index}>
                        {item === 'Models' && (
                            <Grid container spacing={gridSpacing}>
                                {!isChatflowsLoading &&
                                    getAllChatflowsMarketplacesApi.data &&
                                    getAllChatflowsMarketplacesApi.data.map((data, index) => (
                                        <Grid key={index} item lg={3} md={4} sm={6} xs={12}>
                                            <ItemCard onClick={() => goToCanvas(data)} data={data} images={images[data.id]} />
                                        </Grid>
                                    ))}
                            </Grid>
                        )}
                        {item === 'Tools' && (
                            <Grid container spacing={gridSpacing}>
                                {!isToolsLoading &&
                                    getAllToolsMarketplacesApi.data &&
                                    getAllToolsMarketplacesApi.data.map((data, index) => (
                                        <Grid key={index} item lg={3} md={4} sm={6} xs={12}>
                                            <ItemCard data={data} onClick={() => goToTool(data)} />
                                        </Grid>
                                    ))}
                            </Grid>
                        )}
                        {item === 'Triggers' && (
                            <Grid container spacing={gridSpacing}>
                                {!isTriggersLoading &&
                                    getAllTriggersMarketplacesApi.data &&
                                    getAllTriggersMarketplacesApi.data.map((data, index) => (
                                        <Grid key={index} item lg={3} md={4} sm={6} xs={12}>
                                            <ItemCard data={data} onClick={() => goToTrigger(data)} />
                                        </Grid>
                                    ))}
                            </Grid>
                        )}
                        {item === 'Handlers' && (
                            <Grid container spacing={gridSpacing}>
                                {!isHandlersLoading &&
                                    getAllHandlersMarketplacesApi.data &&
                                    getAllHandlersMarketplacesApi.data.map((data, index) => (
                                        <Grid key={index} item lg={3} md={4} sm={6} xs={12}>
                                            <ItemCard data={data} onClick={() => goToHandler(data)} />
                                        </Grid>
                                    ))}
                            </Grid>
                        )}
                    </TabPanel>
                ))}
                {((!isChatflowsLoading && (!getAllChatflowsMarketplacesApi.data || getAllChatflowsMarketplacesApi.data.length === 0)) ||
                    (!isToolsLoading && (!getAllToolsMarketplacesApi.data || getAllToolsMarketplacesApi.data.length === 0))) && (
                    <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                        <Box sx={{ p: 2, height: 'auto' }}>
                            <img
                                style={{ objectFit: 'cover', height: '30vh', width: 'auto' }}
                                src={WorkflowEmptySVG}
                                alt='WorkflowEmptySVG'
                            />
                        </Box>
                        <div>No Marketplace Yet</div>
                    </Stack>
                )}
            </MainCard>
            <ToolDialog
                show={showToolDialog}
                dialogProps={toolDialogProps}
                onCancel={() => setShowToolDialog(false)}
                onConfirm={() => setShowToolDialog(false)}
                onUseTemplate={(tool) => onUseTemplate(tool, 'Tool')}
            ></ToolDialog>
            <TriggerDialog
                show={showTriggerDialog}
                dialogProps={triggerDialogProps}
                onCancel={() => setShowTriggerDialog(false)}
                onConfirm={() => setShowTriggerDialog(false)}
                onUseTemplate={(trigger) => onUseTemplate(trigger, 'Trigger')}
            ></TriggerDialog>
            <HandlerDialog
                show={showHandlerDialog}
                dialogProps={handlerDialogProps}
                onCancel={() => setShowHandlerDialog(false)}
                onConfirm={() => setShowHandlerDialog(false)}
                onUseTemplate={(handler) => onUseTemplate(handler, 'Handler')}
            ></HandlerDialog>
        </>
    )
}

export default Marketplace
