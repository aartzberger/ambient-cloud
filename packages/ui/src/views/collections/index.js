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

// API
import remotesApi from 'api/remotesDb'

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
    },
    {
        label: 'OpenAi',
        name: 'openai',
        description: 'Data hosted on OpenAi'
    }
]

const Collections = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    const getAllCollectionsApi = useApi(remotesApi.getUserCollections)

    const [showDialog, setShowDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})
    const [dataSource, setDataSource] = useState(sourceOptions[0].name ?? '')

    const onUploadFile = (file) => {
        try {
            const dialogProp = {
                title: 'Add New Collection',
                type: 'IMPORT',
                cancelButtonName: 'Cancel',
                confirmButtonName: 'Save',
                data: JSON.parse(file)
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
            confirmButtonName: 'Add'
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
            data: selectedCollection
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
                        <Grid item>
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
                dataSource={dataSource}
            ></CollectionDialog>
        </>
    )
}

export default Collections
