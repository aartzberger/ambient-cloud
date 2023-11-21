import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from 'store/actions'
import CircularProgress from '@mui/material/CircularProgress' // Import the CircularProgress component

import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Box,
    Typography,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    OutlinedInput,
    IconButton,
    Paper
} from '@mui/material'
import { StyledButton } from 'ui-component/button/StyledButton'
import { TooltipWithParser } from 'ui-component/tooltip/TooltipWithParser'
import ConfirmDialog from 'ui-component/dialog/ConfirmDialog'
import { Dropdown } from 'ui-component/dropdown/Dropdown'
import { initNode } from 'utils/genericHelper'
import DocLoader from './DocLoader'

// Icons
import { IconX, IconTrash } from '@tabler/icons'

// API
import remotesApi from 'api/remotesDb'
import nodesApi from 'api/nodes'

// Hooks
import useConfirm from 'hooks/useConfirm'
import useApi from 'hooks/useApi'

// utils
import useNotifier from 'utils/useNotifier'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from 'store/actions'
import remotesDb from 'api/remotesDb'

const CollectionDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')

    const dispatch = useDispatch()

    // ==============================|| Snackbar ||============================== //

    useNotifier()
    const { confirm } = useConfirm()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const querySpecificCollectionApi = useApi(remotesApi.querySpecificCollection)
    const loadUnloadCollectionApi = useApi(remotesApi.loadUnloadCollection)
    const getAllNodesApi = useApi(nodesApi.getAllComplete)

    const [collectionName, setCollectionName] = useState('')
    const [oldCollectionName, setOldCollectionName] = useState('')
    const [filesMap, setFilesMap] = useState(new Map())
    const [mapLoaded, setMapLoaded] = useState(false)
    const [nodeLoaders, setNodeLoaders] = useState([])
    const [selectedLoader, setSelectedLoader] = useState('')
    const [nodeData, setNodeData] = useState({})
    const [pendingUpload, setPendingUpload] = useState(false)
    const [dataDescription, setDataDescription] = useState('')
    const [dataSource, setDataSource] = useState('')

    const [docLoaderDialogProps, setDocLoaderDialogProps] = useState({})

    const updateInputs = (value) => {
        const node = nodeLoaders.find((node) => node.name === value)
        const data = initNode({ ...node }, 0)
        setNodeData(data)

        const props = {
            data,
            inputParams: data.inputParams,
            confirmButtonName: 'Save',
            cancelButtonName: 'Cancel',
            source: dataSource
        }

        setDocLoaderDialogProps(props)
        setSelectedLoader(value)
    }

    const uploadFile = async () => {
        if (Object.keys(nodeData).length === 0) {
            // no file to upload
            return true
        }

        // make sure all the required fields are filled
        let shouldUpload = true
        for (const param of nodeData.inputParams) {
            if (!param.optional && !nodeData.inputs[param.name]) {
                shouldUpload = false
                break
            }
        }

        if ((!shouldUpload && nodeData.inputParams.length > 0) || !dataDescription) {
            enqueueSnackbar({
                message: 'please fill all the required fields',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })

            // error with input
            return false
        }

        try {
            // upload the file
            setPendingUpload(true)

            let saveResp = null
            saveResp = await remotesApi.createCollection(dataSource, {
                name: collectionName,
                nodeData: nodeData,
                dataDescription: dataDescription
            })

            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'File uploaded successfully',
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
                querySpecificCollectionApi.request(dataSource, collectionName)
            }

            setPendingUpload(false)

            // uploaded
            return true
        } catch (error) {
            setPendingUpload(false)
            // some error occured
            return false
        }
    }

    const getUniqueFilesMap = (files) => {
        const fileNameToIdsMap = new Map()

        files.forEach((file) => {
            const { langchain_primaryid, fileName } = file

            if (!fileNameToIdsMap.has(fileName)) {
                fileNameToIdsMap.set(fileName, [langchain_primaryid])
            } else {
                // If the fileName already exists in the map, push the id to the existing array.
                fileNameToIdsMap.get(fileName).push(langchain_primaryid)
            }
        })

        return fileNameToIdsMap
    }

    const updateName = (name) => {
        setCollectionName(name)
    }

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    useEffect(() => {
        if (querySpecificCollectionApi.data) {
            const map = getUniqueFilesMap(querySpecificCollectionApi.data.data)
            setFilesMap(map)
            setMapLoaded(true)
        }
    }, [querySpecificCollectionApi.data])

    useEffect(() => {
        if (loadUnloadCollectionApi.data) {
            console.log(loadUnloadCollectionApi.data)
        }
    }, [loadUnloadCollectionApi.data])

    useEffect(() => {
        if (getAllNodesApi.data) {
            const docNodes = getAllNodesApi.data.filter((node) => node.category === 'Document Loaders')
            setNodeLoaders(docNodes)
        }
    }, [getAllNodesApi.data])

    useEffect(() => {
        getAllNodesApi.request()
    }, [])

    useEffect(() => {
        setMapLoaded(false)

        if (dialogProps.type === 'EDIT' && dialogProps.data) {
            // When tool dialog is opened from CustomTool node in canvas
            setCollectionName(dialogProps.data.name)
            querySpecificCollectionApi.request(dialogProps.dataSource, dialogProps.data.name)
            setOldCollectionName(dialogProps.data.name)
            setDataSource(dialogProps.dataSource)
        } else if (dialogProps.type === 'EDIT' && dialogProps.name) {
            // When tool dialog is opened from CustomTool node in canvas
            setCollectionName(dialogProps.name)
            querySpecificCollectionApi.request(dialogProps.dataSource, dialogProps.name)
            setOldCollectionName(dialogProps.name)
            setDataSource(dialogProps.dataSource)
        } else if (dialogProps.type === 'ADD') {
            // When tool dialog is to add a new tool
            setCollectionName('')
            setOldCollectionName('')
            setDataSource(dialogProps.dataSource)
        }

        setFilesMap(new Map())

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    const updateCollection = async () => {
        if (collectionName !== oldCollectionName && dialogProps.type === 'EDIT') {
            try {
                let saveResp = null

                const args = {
                    oldName: oldCollectionName,
                    newName: collectionName
                }
                saveResp = await remotesApi.renameCollection(dialogProps.dataSource, args)

                if (saveResp ? saveResp.data : true) {
                    enqueueSnackbar({
                        message: 'Collection saved',
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
                }
            } catch (error) {
                console.error(error)
            }
        }

        const status = await uploadFile()

        if (status) {
            setSelectedLoader('')
            setDataDescription('')
            setNodeData({})
            onConfirm()
        }
    }

    const deleteEntities = async (entities) => {
        try {
            const args = {
                collection_name: collectionName,
                entities: entities
            }

            const delResp = await remotesDb.deleteEntities(dataSource, args)
            if (delResp.data) {
                enqueueSnackbar({
                    message: 'File deleted',
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
                querySpecificCollectionApi.request(dataSource, collectionName)
            }
        } catch (error) {
            const errorData = error.response.data || `${error.response.status}: ${error.response.statusText}`
            enqueueSnackbar({
                message: `Failed to delete file: ${errorData}`,
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
            setSelectedLoader('')
            onCancel()
        }
    }

    const deleteCollection = async () => {
        const confirmPayload = {
            title: `Delete Tool`,
            description: `Delete collection ${collectionName}?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                const delResp = await remotesDb.deleteCollection(dataSource, collectionName)
                if (delResp.data) {
                    enqueueSnackbar({
                        message: 'Collection deleted',
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
                    message: `Failed to delete Collection: ${errorData}`,
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
                setSelectedLoader('')
                onCancel()
            }
        }
    }

    const component = show ? (
        <Dialog
            fullWidth
            maxWidth='md'
            open={show}
            onClose={() => {
                setSelectedLoader('')
                onCancel()
            }}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                <div style={{ display: 'flex', flexDirection: 'row' }}>
                    {dialogProps.title}
                    <div style={{ flex: 1 }} />
                </div>
            </DialogTitle>
            <PerfectScrollbar
                style={{
                    height: '100%',
                    maxHeight: 'calc(100vh - 220px)',
                    overflowX: 'hidden'
                }}
            >
                <DialogContent>
                    <Box sx={{ p: 2 }}>
                        <Stack sx={{ position: 'relative' }} direction='row'>
                            <Typography variant='overline'>
                                Collection Name
                                <span style={{ color: 'red' }}>&nbsp;*</span>
                                <TooltipWithParser
                                    style={{ marginLeft: 10 }}
                                    title={
                                        'Collection name cannot be changed after creation! Collection name must be small capital letter with underscore. Ex: my_collection'
                                    }
                                />
                            </Typography>
                        </Stack>
                        <OutlinedInput
                            id='collectionName'
                            type='string'
                            fullWidth
                            disabled={dialogProps.type === 'TEMPLATE' || dialogProps.type !== 'ADD'} // TODO CMAN - allow partition name update
                            placeholder='My New Collection'
                            value={collectionName}
                            name='collectionName'
                            onChange={(e) => updateName(e.target.value)}
                        />
                    </Box>
                    <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                        <div style={{ display: 'flex', flexDirection: 'row' }}>
                            Insert Documents
                            <div style={{ flex: 1 }} />
                        </div>
                    </DialogTitle>
                    <Box sx={{ p: 2 }}>
                        <Stack sx={{ position: 'relative' }} direction='row'>
                            <Typography variant='overline'>
                                Document Name / Description:
                                <span style={{ color: 'red' }}>&nbsp;*</span>
                                <TooltipWithParser
                                    style={{ marginLeft: 10 }}
                                    title={'Collection name must be small capital letter with underscore. Ex: my_collection'}
                                />
                            </Typography>
                        </Stack>
                        <OutlinedInput
                            id='dataDescription'
                            type='string'
                            fullWidth
                            disabled={false}
                            placeholder='My Uploaded Data'
                            value={dataDescription}
                            name='dataDescription'
                            onChange={(e) => setDataDescription(e.target.value)}
                        />
                    </Box>
                    <Box sx={{ p: 2 }}>
                        <>
                            <Stack sx={{ position: 'relative' }} direction='row'>
                                <Typography variant='overline'>
                                    Document Source
                                    <span style={{ color: 'red' }}>&nbsp;*</span>
                                    <TooltipWithParser
                                        style={{ marginLeft: 10 }}
                                        title={'Select where to upload the documents from. Ex: File Upload, Google Drive, S3, etc.'}
                                    />
                                </Typography>
                            </Stack>
                        </>
                        {nodeLoaders && (
                            <>
                                <Dropdown
                                    key={selectedLoader}
                                    name={selectedLoader}
                                    options={nodeLoaders}
                                    onSelect={(newValue) => updateInputs(newValue)}
                                    value={selectedLoader ?? 'choose an option'}
                                />
                                {/* <StyledButton variant='contained' onClick={() => onDialogClicked()}>
                                    Import
                                </StyledButton> */}
                                <DocLoader show={selectedLoader} dialogProps={docLoaderDialogProps}></DocLoader>
                            </>
                        )}
                    </Box>
                    {mapLoaded && dialogProps.type !== 'ADD' && (
                        <TableContainer component={Paper}>
                            <Table sx={{ minWidth: 650 }} aria-label='simple table'>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Current Collection Contents:</TableCell>
                                        <TableCell> </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {Array.from(filesMap).map(([name, ids]) => (
                                        <TableRow key={name} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <TableCell component='th' scope='row'>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'row',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    {name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <IconButton title='Delete' color='error' onClick={() => deleteEntities(ids)}>
                                                    <IconTrash />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </DialogContent>
                <DialogActions>
                    {dialogProps.type === 'EDIT' && (
                        <StyledButton color='error' variant='contained' onClick={() => deleteCollection()}>
                            Delete
                        </StyledButton>
                    )}
                    {dialogProps.type !== 'TEMPLATE' && (
                        <StyledButton disabled={false} variant='contained' onClick={() => updateCollection()}>
                            {dialogProps.confirmButtonName}
                        </StyledButton>
                    )}
                </DialogActions>
                <ConfirmDialog />
                {pendingUpload && ( // Conditionally render the loading spinner
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            background: 'rgba(255, 255, 255, 0.7)', // Semi-transparent overlay
                            zIndex: 9999 // Higher z-index value to overlay other content
                        }}
                    >
                        <CircularProgress color='primary' size={40} /> {/* Use the CircularProgress component */}
                    </div>
                )}
            </PerfectScrollbar>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

CollectionDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default CollectionDialog
