import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
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
import { File } from 'ui-component/file/File'

// Icons
import { IconX, IconTrash } from '@tabler/icons'

// API
import remotesApi from 'api/remotes'

// Hooks
import useConfirm from 'hooks/useConfirm'
import useApi from 'hooks/useApi'

// utils
import useNotifier from 'utils/useNotifier'
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from 'store/actions'

const CollectionDialog = ({ show, dialogProps, onUseTemplate, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')

    const dispatch = useDispatch()

    // ==============================|| Snackbar ||============================== //

    useNotifier()
    const { confirm } = useConfirm()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const getSpecificCollectionApi = useApi(remotesApi.getSpecificCollection)
    const querySpecificCollectionApi = useApi(remotesApi.querySpecificCollection)
    const loadUnloadCollectionApi = useApi(remotesApi.loadUnloadCollection)

    const [collectionName, setCollectionName] = useState('')
    const [oldCollectionName, setOldCollectionName] = useState('')
    const [filesMap, setFilesMap] = useState(new Map())
    const [mapLoaded, setMapLoaded] = useState(false)
    const [pendingUpload, setPendingUpload] = useState(false)
    const [hasUploaded, setHasUploaded] = useState(false)

    const uploadFile = async (value) => {
        try {
            setPendingUpload(true)
            const saveResp = await remotesApi.createCollection(collectionName, {
                files: value
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
                querySpecificCollectionApi.request(collectionName)
            }
            setPendingUpload(false)
            setHasUploaded(true)
        } catch (error) {
            console.error(error)
            setPendingUpload(false)
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
        if (getSpecificCollectionApi.data) {
            setCollectionName(getSpecificCollectionApi.data.collection_name)
        }
    }, [getSpecificCollectionApi.data])

    useEffect(() => {
        if (querySpecificCollectionApi.data) {
            const map = getUniqueFilesMap(querySpecificCollectionApi.data.data)
            if (querySpecificCollectionApi.data.data.length > 0) {
                setHasUploaded(true)
            }
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
        setMapLoaded(false)

        if (dialogProps.type === 'EDIT' && dialogProps.name) {
            // When tool dialog is opened from CustomTool node in canvas
            setCollectionName('')
            getSpecificCollectionApi.request(dialogProps.name)
            querySpecificCollectionApi.request(dialogProps.name)
            setOldCollectionName(dialogProps.name)
        } else if (dialogProps.type === 'EDIT' && dialogProps.data.name) {
            // When tool dialog is opened from CustomTool node in canvas
            setCollectionName('')
            getSpecificCollectionApi.request(dialogProps.data.name)
            querySpecificCollectionApi.request(dialogProps.data.name)
            setOldCollectionName(dialogProps.data.name)
        } else if (dialogProps.type === 'ADD') {
            // When tool dialog is to add a new tool
            setCollectionName('')
            setOldCollectionName('')
        }

        setFilesMap(new Map())
        setHasUploaded(false)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    const updateCollection = async () => {
        try {
            let saveResp = null

            if (oldCollectionName !== collectionName && dialogProps.type !== 'ADD') {
                const args = {
                    oldName: oldCollectionName,
                    newName: collectionName
                }
                saveResp = await remotesApi.renameCollection(args)
            }

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
                onConfirm()
            }
        } catch (error) {
            console.error(error)
        }
    }

    const deleteEntities = async (entities) => {
        try {
            const expression = `langchain_primaryid in [${entities}]`

            const args = {
                collection_name: collectionName,
                expr: expression
            }

            const delResp = await remotesApi.deleteEntities(args)
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
                querySpecificCollectionApi.request(collectionName)
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
                const delResp = await remotesApi.deleteCollection(collectionName)
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
                </div>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            Collection Name
                            <span style={{ color: 'red' }}>&nbsp;*</span>
                            <TooltipWithParser
                                style={{ marginLeft: 10 }}
                                title={'Collection name must be small capital letter with underscore. Ex: my_collection'}
                            />
                        </Typography>
                    </Stack>
                    <OutlinedInput
                        id='collectionName'
                        type='string'
                        fullWidth
                        disabled={dialogProps.type === 'TEMPLATE'}
                        placeholder='My New Collection'
                        value={collectionName}
                        name='collectionName'
                        onChange={(e) => updateName(e.target.value)}
                    />
                </Box>
                <Box sx={{ p: 2 }}>
                    <File
                        disabled={collectionName === ''}
                        fileType={'*'}
                        onChange={(newValue) => uploadFile(newValue)}
                        value={'Choose a file to upload'}
                    />
                </Box>
                {mapLoaded && dialogProps.type !== 'ADD' && (
                    <TableContainer component={Paper}>
                        <Table sx={{ minWidth: 650 }} aria-label='simple table'>
                            <TableHead>
                                <TableRow>
                                    <TableCell>File Name:</TableCell>
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
                    <StyledButton disabled={!hasUploaded} variant='contained' onClick={() => updateCollection()}>
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
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

CollectionDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onUseTemplate: PropTypes.func,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default CollectionDialog
