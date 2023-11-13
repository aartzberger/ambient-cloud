import PropTypes from 'prop-types'
import { useRef, useState } from 'react'

// material-ui
import { IconButton } from '@mui/material'
import { IconEdit } from '@tabler/icons'

// project import
import { AsyncDropdown } from 'ui-component/dropdown/AsyncDropdown'

// API
import remoteDb from 'api/remotesDb'

// ===========================|| CollectionInputHandler ||=========================== //

const CollectionInputHandler = ({ inputParam, data, onSelect, disabled = false }) => {
    const ref = useRef(null)
    const [collections, setCollections] = useState([])
    const [selectedCollection, setSelectedCollection] = useState(data ? data : '')

    const addAsyncOptions = async () => {}

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
                                {/* {selectedCollection && (
                                    <IconButton title='Edit' color='primary' size='small'>
                                        <IconEdit />
                                    </IconButton>
                                )} */}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    )
}

CollectionInputHandler.propTypes = {
    inputParam: PropTypes.object,
    data: PropTypes.object,
    onSelect: PropTypes.func,
    disabled: PropTypes.bool
}

export default CollectionInputHandler
