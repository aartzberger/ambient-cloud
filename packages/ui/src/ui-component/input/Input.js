import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { FormControl, OutlinedInput } from '@mui/material'
import ExpandTextDialog from 'ui-component/dialog/ExpandTextDialog'

// API
import remotesApi from 'api/remotes'

export const Input = ({
    data,
    inputParam,
    value,
    onChange,
    disabled = false,
    showDialog,
    dialogProps,
    onDialogCancel,
    onDialogConfirm
}) => {
    const [myValue, setMyValue] = useState(value ?? '')
    const [url, setUrl] = useState(value ?? '')

    const getInputType = (type) => {
        switch (type) {
            case 'string':
                return 'text'
            case 'password':
                return 'password'
            case 'number':
                return 'number'
            default:
                return 'text'
        }
    }

    // TODO: ideally we should spin milvus url into ints own ui component
    useEffect(() => {
        const getUrl = async () => {
            try {
                const res = await remotesApi.getUserClientEndpoint()
                setUrl(res.data.endpoint ? res.data.endpoint : none)
                data.inputs[inputParam.name] = res.data.endpoint ? res.data.endpoint : none
            } catch (e) {
                console.error(e)
                setUrl('None')
                data.inputs[inputParam.name] = 'None'
            }
        }

        inputParam.name === 'serverUrl' && getUrl()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <>
            <FormControl sx={{ mt: 1, width: '100%' }} size='small'>
                <OutlinedInput
                    id={inputParam.name}
                    size='small'
                    disabled={disabled}
                    type={getInputType(inputParam.type)}
                    placeholder={inputParam.placeholder}
                    multiline={!!inputParam.rows}
                    rows={inputParam.rows ?? 1}
                    value={inputParam.name === 'serverUrl' && url ? url : myValue}
                    name={inputParam.name}
                    onChange={(e) => {
                        setMyValue(e.target.value)
                        onChange(e.target.value)
                    }}
                    inputProps={{
                        step: inputParam.step ?? 1,
                        style: {
                            height: inputParam.rows ? '90px' : 'inherit'
                        }
                    }}
                />
            </FormControl>
            {showDialog && (
                <ExpandTextDialog
                    show={showDialog}
                    dialogProps={dialogProps}
                    onCancel={onDialogCancel}
                    onConfirm={(newValue, inputParamName) => {
                        setMyValue(newValue)
                        onDialogConfirm(newValue, inputParamName)
                    }}
                ></ExpandTextDialog>
            )}
        </>
    )
}

Input.propTypes = {
    data: PropTypes.object,
    inputParam: PropTypes.object,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onChange: PropTypes.func,
    disabled: PropTypes.bool,
    showDialog: PropTypes.bool,
    dialogProps: PropTypes.object,
    onDialogCancel: PropTypes.func,
    onDialogConfirm: PropTypes.func
}
