import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

// material-ui
import { Grid, Box, Stack } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import MainCard from 'ui-component/cards/MainCard'
import ItemCard from 'ui-component/cards/ItemCard'
import { Dropdown } from 'ui-component/dropdown/Dropdown'
import { gridSpacing } from 'store/constant'
import ToolEmptySVG from 'assets/images/tools_empty.svg'
import { StyledButton } from 'ui-component/button/StyledButton'
import CollectionDialog from './CollectionDialog'
import LoginDialog from 'ui-component/dialog/LoginDialog'
import { checkApiErrorAndHandleLogin } from '../../api/apiHelpers'

// API
import remotesApi from 'api/remotesDb'
import credentialsApi from 'api/credentials'

// Hooks
import useApi from 'hooks/useApi'

// icons
import { IconPlus } from '@tabler/icons'

// ==============================|| Collections ||============================== //

const sourceOptions = [
    {
        label: 'Cloud',
        name: 'cloud',
        description: 'Data on AmbientWare cloud'
    },
    {
        label: 'Local',
        name: 'local',
        description: 'Data on your local machine'
    }
]

const Collections = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const getAllCollectionsApi = useApi(remotesApi.getUserCollections)
    const getAllCredentialsApi = useApi(credentialsApi.getAllCredentials)

    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})
    const [docLoaderDialogProps, setDocLoaderDialogProps] = useState({})
    const [dataSource, setDataSource] = useState(sourceOptions[0].name ?? '')
    const [loginDialogOpen, setLoginDialogOpen] = useState(false)
    const [loginDialogProps, setLoginDialogProps] = useState({})

    const onUploadFile = (file) => {
        try {
            const dialogProp = {
                title: 'Add New Collection',
                type: 'IMPORT',
                cancelButtonName: 'Cancel',
                confirmButtonName: 'Save',
                data: JSON.parse(file),
                dataSource: dataSource
            }
            setDialogProps(dialogProp)
            setShowDialog(true)
        } catch (e) {
            console.error(e)
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

    const addNew = () => {
        const dialogProp = {
            title: 'Add New Collection',
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add',
            dataSource: dataSource
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const edit = (selectedCollection) => {
        const dialogProp = {
            title: 'Edit Collection',
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            data: selectedCollection,
            dataSource: dataSource
        }
        setDialogProps(dialogProp)
        setShowDialog(true)
    }

    const updateDataSource = (source) => {
        setDataSource(source)
        getAllCollectionsApi.request(source)
    }

    const onConfirm = () => {
        setShowDialog(false)
        getAllCollectionsApi.request(dataSource)
    }

    const onImport = (props) => {
        setDocLoaderDialogProps(props)
        setShowDialog(false)
        setTimeout(() => setShowDocLoaderDialog(true), 300)
    }

    useEffect(() => {
        if (getAllCollectionsApi.error) {
            checkApiErrorAndHandleLogin(getAllCredentialsApi, setLoginDialogProps, setLoginDialogOpen)
        }
    }, [getAllCollectionsApi.error])

    useEffect(() => {
        getAllCollectionsApi.request(dataSource)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <>
            <MainCard sx={{ background: customization.isDarkMode ? theme.palette.common.black : '' }}>
                <Stack flexDirection='row'>
                    <h1>Collections</h1>
                    <Grid container alignItems='center' spacing={2} sx={{ mb: 1.25 }}>
                        <Box sx={{ flexGrow: 1 }} />
                        <Grid item xs={1} sm={2}>
                            <Dropdown
                                value={dataSource}
                                onSelect={updateDataSource}
                                name={'dropdown'}
                                options={sourceOptions}
                                fullWidth // This can be used instead of sx={{ width: '100%' }}
                            />
                        </Grid>
                        <Grid item xs={1} sm={2}>
                            <StyledButton variant='contained' sx={{ color: 'white' }} onClick={addNew} startIcon={<IconPlus />}>
                                Create
                            </StyledButton>
                        </Grid>
                    </Grid>
                </Stack>
                <Grid container spacing={gridSpacing}>
                    {!getAllCollectionsApi.loading &&
                        getAllCollectionsApi.data &&
                        getAllCollectionsApi.data.map((data, index) => (
                            <Grid key={index} item lg={3} md={4} sm={6} xs={12}>
                                <ItemCard data={data} onClick={() => edit(data)} />
                            </Grid>
                        ))}
                </Grid>
                {!getAllCollectionsApi.loading && (!getAllCollectionsApi.data || getAllCollectionsApi.data.length === 0) && (
                    <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                        <Box sx={{ p: 2, height: 'auto' }}>
                            <img style={{ objectFit: 'cover', height: '30vh', width: 'auto' }} src={ToolEmptySVG} alt='ToolEmptySVG' />
                        </Box>
                        <div>No Collections Loaded Yet</div>
                    </Stack>
                )}
            </MainCard>
            <CollectionDialog
                show={showDialog}
                dialogProps={dialogProps}
                onCancel={() => setShowDialog(false)}
                onConfirm={onConfirm}
                onImport={onImport}
            ></CollectionDialog>
            <LoginDialog show={loginDialogOpen} dialogProps={loginDialogProps} />
        </>
    )
}

export default Collections
