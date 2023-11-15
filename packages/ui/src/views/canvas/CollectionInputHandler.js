import PropTypes from 'prop-types'
import { useRef, useState } from 'react'

// material-ui
import { IconButton } from '@mui/material'
import { IconEdit } from '@tabler/icons'

// collection dialog
import CollectionDialog from '../collections/CollectionDialog'

// project import
import { AsyncDropdown } from 'ui-component/dropdown/AsyncDropdown'

// ===========================|| CollectionInputHandler ||=========================== //

const CollectionInputHandler = ({ inputParam, data, onSelect, onUpdate, disabled = false }) => {
    const ref = useRef(null)
    const [showCollectionDialog, setShowCollectionDialog] = useState(false)
    const [collectionDialogProps, setCollectionDialogProps] = useState({})
    const [selectedCollection, setSelectedCollection] = useState(data ? data : '')

    const addAsyncOptions = async () => {}

    const edit = () => {
        console.log(selectedCollection)
        const dialogProp = {
            title: 'Edit Collection',
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            data: { name: selectedCollection }
        }
        setCollectionDialogProps(dialogProp)
        setShowCollectionDialog(true)
    }

    return (
        <div ref={ref}>
            {inputParam && (
                <>
                    {inputParam.type === 'collection' && (
                        <>
                            <div style={{ marginTop: 10 }} />
                            <div style={{ display: 'flex', flexDirection: 'row' }}>
                                <AsyncDropdown
                                    disabled={disabled}
                                    name={inputParam.name}
                                    nodeData={data}
                                    value={selectedCollection ?? 'choose a collection'}
                                    isCreateNewOption={true}
                                    isCollection={inputParam.isCollection}
                                    onSelect={(newValue) => {
                                        setSelectedCollection(newValue)
                                        onSelect(newValue)
                                    }}
                                    onCreateNew={() => addAsyncOptions()}
                                />
                                {selectedCollection && (
                                    <IconButton title='Edit' color='primary' size='small' onClick={() => edit()}>
                                        <IconEdit />
                                    </IconButton>
                                )}
                            </div>
                        </>
                    )}
                </>
            )}
            {showCollectionDialog && (
                <CollectionDialog
                    show={showCollectionDialog}
                    dialogProps={collectionDialogProps}
                    onCancel={() => setShowCollectionDialog(false)}
                    onConfirm={() => {
                        onUpdate()
                        setShowCollectionDialog(false)
                    }}
                    dataSource={'openai'}
                ></CollectionDialog>
            )}
        </div>
    )
}

CollectionInputHandler.propTypes = {
    inputParam: PropTypes.object,
    data: PropTypes.object,
    onSelect: PropTypes.func,
    onUpdate: PropTypes.func,
    disabled: PropTypes.bool
}

export default CollectionInputHandler
