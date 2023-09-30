import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from 'store/actions'
import { cloneDeep } from 'lodash'

import { Box, Typography, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, OutlinedInput } from '@mui/material'
import { StyledButton } from 'ui-component/button/StyledButton'
import { Grid } from 'ui-component/grid/Grid'
import { TooltipWithParser } from 'ui-component/tooltip/TooltipWithParser'
import { GridActionsCellItem } from '@mui/x-data-grid'
import DeleteIcon from '@mui/icons-material/Delete'
import ConfirmDialog from 'ui-component/dialog/ConfirmDialog'
import { useTheme } from '@mui/material/styles'

// Icons
import { IconX, IconFileExport } from '@tabler/icons'

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
    const theme = useTheme()

    const dispatch = useDispatch()

    // ==============================|| Snackbar ||============================== //

    useNotifier()
    const { confirm } = useConfirm()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const getSpecificCollectionApi = useApi(remotesApi.getSpecificCollection)

    const [collectionName, setCollectionName] = useState('')
    const [collectionDesc, setCollectionDesc] = useState('')

    const deleteItem = useCallback(
        (id) => () => {
            setTimeout(() => {
                setToolSchema((prevRows) => prevRows.filter((row) => row.id !== id))
            })
        },
        []
    )

    const uploadFile = () => {
        console.log('upload file')
    }

    const addNewRow = () => {
        setTimeout(() => {
            setToolSchema((prevRows) => {
                let allRows = [...cloneDeep(prevRows)]
                const lastRowId = allRows.length ? allRows[allRows.length - 1].id + 1 : 1
                allRows.push({
                    id: lastRowId,
                    property: '',
                    description: '',
                    type: '',
                    required: false
                })
                return allRows
            })
        })
    }

    const onRowUpdate = (newRow) => {
        setTimeout(() => {
            setToolSchema((prevRows) => {
                let allRows = [...cloneDeep(prevRows)]
                const indexToUpdate = allRows.findIndex((row) => row.id === newRow.id)
                if (indexToUpdate >= 0) {
                    allRows[indexToUpdate] = { ...newRow }
                }
                return allRows
            })
        })
    }

    const columns = useMemo(
        () => [
            { field: 'property', headerName: 'Property', editable: true, flex: 1 },
            {
                field: 'type',
                headerName: 'Type',
                type: 'singleSelect',
                valueOptions: ['string', 'number', 'boolean', 'date'],
                editable: true,
                width: 120
            },
            { field: 'description', headerName: 'Description', editable: true, flex: 1 },
            { field: 'required', headerName: 'Required', type: 'boolean', editable: true, width: 80 },
            {
                field: 'actions',
                type: 'actions',
                width: 80,
                getActions: (params) => [
                    <GridActionsCellItem key={'Delete'} icon={<DeleteIcon />} label='Delete' onClick={deleteItem(params.id)} />
                ]
            }
        ],
        [deleteItem]
    )

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    useEffect(() => {
        if (getSpecificCollectionApi.data) {
            console.log(getSpecificCollectionApi.data)
            setCollectionName(getSpecificCollectionApi.data.collection_name)
            setCollectionDesc(getSpecificCollectionApi.data.schema.description)
        }
    }, [getSpecificCollectionApi.data])

    useEffect(() => {
        if (dialogProps.type === 'EDIT' && dialogProps.name) {
            // When tool dialog is opened from CustomTool node in canvas
            setCollectionName('')
            getSpecificCollectionApi.request(dialogProps.name)
        } else if (dialogProps.type === 'EDIT' && dialogProps.data.name) {
            // When tool dialog is opened from CustomTool node in canvas
            setCollectionName('')
            getSpecificCollectionApi.request(dialogProps.data.name)
        } else if (dialogProps.type === 'ADD') {
            // When tool dialog is to add a new tool
            setCollectionName('')
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    const addNewCollection = async () => {
        try {
            const obj = {
                name: collectionName
            }
        } catch (error) {
            console.error(error)
        }
    }

    const saveCollection = async () => {
        try {
            const saveResp = await toolsApi.updateTool(toolId, {
                name: collectionName
            })
        } catch (error) {
            console.error(error)
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
            console.log('delete tool')
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
                    <Button variant='outlined' onClick={() => uploadFile()} startIcon={<IconFileExport />}>
                        Import Data
                    </Button>
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
                        onChange={(e) => setCollectionName(e.target.value)}
                    />
                </Box>
                <Box sx={{ p: 2 }}>
                    <Stack sx={{ position: 'relative' }} direction='row'>
                        <Typography variant='overline'>
                            Collection description
                            <span style={{ color: 'red' }}>&nbsp;*</span>
                            <TooltipWithParser style={{ marginLeft: 10 }} title={'Description of whats in the tool collection'} />
                        </Typography>
                    </Stack>
                    <OutlinedInput
                        id='collectionDesc'
                        type='string'
                        fullWidth
                        disabled={dialogProps.type === 'TEMPLATE'}
                        placeholder='Description of whats in the collection'
                        multiline={true}
                        rows={3}
                        value={collectionDesc}
                        name='collectionDesc'
                        onChange={(e) => setCollectionDesc(e.target.value)}
                    />
                </Box>
            </DialogContent>
            <DialogActions>
                {dialogProps.type === 'EDIT' && (
                    <StyledButton color='error' variant='contained' onClick={() => deleteCollection()}>
                        Delete
                    </StyledButton>
                )}
                {dialogProps.type !== 'TEMPLATE' && (
                    <StyledButton
                        disabled={!collectionName && collectionDesc}
                        variant='contained'
                        onClick={() => (dialogProps.type === 'ADD' || dialogProps.type === 'IMPORT' ? addNewTool() : saveTool())}
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

CollectionDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onUseTemplate: PropTypes.func,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default CollectionDialog
