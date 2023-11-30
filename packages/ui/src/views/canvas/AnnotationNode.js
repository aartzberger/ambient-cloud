import PropTypes from 'prop-types'
import { useContext, useState, useEffect } from 'react'
import { useSelector } from 'react-redux'

// material-ui
import { styled, useTheme } from '@mui/material/styles'
import { IconButton, Box } from '@mui/material'
import Tooltip, { tooltipClasses } from '@mui/material/Tooltip'

// project imports
import MainCard from 'ui-component/cards/MainCard'
import NodeInputHandler from './NodeInputHandler'
import NodeInfoDialog from 'ui-component/dialog/NodeInfoDialog'

// const
import { IconTrash, IconCopy, IconInfoCircle } from '@tabler/icons'
import { flowContext } from 'store/context/ReactFlowContext'

const CardWrapper = styled(MainCard)(({ theme }) => ({
    background: theme.palette.card.main,
    borderRadius: '10px',
    color: theme.darkTextPrimary,
    border: 'solid 1px',
    borderColor: theme.palette.primary[200] + 75,
    width: '300px',
    height: 'auto',
    padding: '10px',
    boxShadow: '0 2px 14px 0 rgb(32 40 45 / 8%)',
    '&:hover': {
        borderColor: theme.palette.primary.main,
        boxShadow: '0 6px 25px 6px rgb(32 40 45 / 20%)'
    }
}))

const LightTooltip = styled(({ className, ...props }) => <Tooltip {...props} classes={{ popper: className }} />)(({ theme }) => ({
    [`& .${tooltipClasses.tooltip}`]: {
        backgroundColor: theme.palette.nodeToolTip.background,
        color: theme.palette.nodeToolTip.color,
        boxShadow: theme.shadows[1]
    }
}))

// ===========================|| CANVAS NODE ||=========================== //

const AnnotationNode = ({ data }) => {
    const theme = useTheme()
    const canvas = useSelector((state) => state.canvas)
    const { deleteNode, duplicateNode } = useContext(flowContext)

    const [showInfoDialog, setShowInfoDialog] = useState(false)
    const [infoDialogProps, setInfoDialogProps] = useState({})
    const [warningMessage, setWarningMessage] = useState('')
    const [open, setOpen] = useState(false)

    const handleClose = () => {
        setOpen(false)
    }

    const handleOpen = () => {
        setOpen(true)
    }

    const nodeOutdatedMessage = (oldVersion, newVersion) => `Node version ${oldVersion} outdated\nUpdate to latest version ${newVersion}`

    const nodeVersionEmptyMessage = (newVersion) => `Node outdated\nUpdate to latest version ${newVersion}`

    useEffect(() => {
        const componentNode = canvas.componentNodes.find((nd) => nd.name === data.name)
        if (componentNode) {
            if (!data.version) {
                setWarningMessage(nodeVersionEmptyMessage(componentNode.version))
            } else if (data.version && componentNode.version > data.version) {
                setWarningMessage(nodeOutdatedMessage(data.version, componentNode.version))
            } else if (componentNode.badge === 'DEPRECATING') {
                setWarningMessage('This node will be deprecated in the next release. Change to a new node tagged with NEW')
            }
        }
    }, [canvas.componentNodes, data.name, data.version])

    return (
        <>
            <CardWrapper
                content={false}
                sx={{
                    padding: 0,
                    borderColor: data.selected ? theme.palette.primary.main : theme.palette.text.secondary
                }}
                border={false}
            >
                <LightTooltip
                    open={!canvas.canvasDialogShow && open}
                    onClose={handleClose}
                    onOpen={handleOpen}
                    disableFocusListener={true}
                    title={
                        <div
                            style={{
                                background: 'transparent',
                                display: 'flex',
                                flexDirection: 'row'
                            }}
                        >
                            <IconButton
                                title='Duplicate'
                                onClick={() => {
                                    duplicateNode(data.id)
                                }}
                                sx={{ height: '35px', width: '35px', '&:hover': { color: theme?.palette.primary.main } }}
                                color={theme?.customization?.isDarkMode ? theme.colors?.paper : 'inherit'}
                            >
                                <IconCopy />
                            </IconButton>
                            <IconButton
                                title='Delete'
                                onClick={() => {
                                    deleteNode(data.id)
                                }}
                                sx={{ height: '35px', width: '35px', '&:hover': { color: 'red' } }}
                                color={theme?.customization?.isDarkMode ? theme.colors?.paper : 'inherit'}
                            >
                                <IconTrash />
                            </IconButton>
                            <IconButton
                                title='Info'
                                onClick={() => {
                                    setInfoDialogProps({ data })
                                    setShowInfoDialog(true)
                                }}
                                sx={{ height: '35px', width: '35px', '&:hover': { color: theme?.palette.secondary.main } }}
                                color={theme?.customization?.isDarkMode ? theme.colors?.paper : 'inherit'}
                            >
                                <IconInfoCircle />
                            </IconButton>
                        </div>
                    }
                    placement='top-end'
                >
                    <Box>
                        {data.inputAnchors.map((inputAnchor, index) => (
                            <NodeInputHandler key={index} inputAnchor={inputAnchor} data={data} />
                        ))}
                        {data.inputParams
                            .filter((inputParam) => !inputParam.hidden)
                            .map((inputParam, index) => (
                                <NodeInputHandler key={index} inputParam={inputParam} data={data} />
                            ))}
                    </Box>
                </LightTooltip>
            </CardWrapper>
            <NodeInfoDialog show={showInfoDialog} dialogProps={infoDialogProps} onCancel={() => setShowInfoDialog(false)}></NodeInfoDialog>
        </>
    )
}

AnnotationNode.propTypes = {
    data: PropTypes.object
}

export default AnnotationNode
