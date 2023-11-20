import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { Dialog, DialogContent, DialogTitle, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper } from '@mui/material'
import axios from 'axios'
import { baseURL } from 'store/constant'
import { StyledButton } from 'ui-component/button/StyledButton'

const AccountDialog = ({ show, onCancel, showSubs }) => {
    const portalElement = document.getElementById('portal')

    const [data, setData] = useState({})

    const manageSubscriptionClick = async (status) => {
        if (status === 'active' || status === 'trialing') {
            const subscriptionDetails = await axios.get(`${baseURL}/api/v1/subscriptions/portal`)
            // redirect to subscription management portal
            window.location = subscriptionDetails.data.url
        } else {
            showSubs()
            show = false
        }
    }

    useEffect(() => {
        const subscriptionDetails = axios.get(`${baseURL}/api/v1/subscriptions/user`)

        Promise.all([subscriptionDetails])
            .then(([subscriptionDetails]) => {
                console.log('subscriptionDetails', subscriptionDetails.data)
                setData(subscriptionDetails.data)
            })
            .catch((error) => {
                console.error('Error fetching customer subscription data:', error)
            })

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const component = show ? (
        <Dialog
            onClose={onCancel}
            open={show}
            fullWidth
            maxWidth='sm'
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '2rem' }} id='alert-dialog-title'>
                Account Information
            </DialogTitle>
            <DialogContent>
                {data && (
                    <TableContainer component={Paper}>
                        <Table aria-label='simple table'>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ textAlign: 'center' }}>User</TableCell>
                                    <TableCell sx={{ textAlign: 'center' }}>Plan</TableCell>
                                    <TableCell sx={{ textAlign: 'center' }}>Status</TableCell>
                                    <TableCell sx={{ textAlign: 'center' }}>Subscription</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell sx={{ textAlign: 'center', alignContent: 'center' }} component='th' scope='row'>
                                        {data.name}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'center', alignContent: 'center' }} component='th' scope='row'>
                                        {data.plan || 'Free'}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'center', alignContent: 'center' }} component='th' scope='row'>
                                        {data.status || 'trieling'}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'center', alignContent: 'center' }} component='th' scope='row'>
                                        <StyledButton
                                            type='submit'
                                            variant='contained'
                                            sx={{ color: 'white' }}
                                            onClick={() => manageSubscriptionClick(data.status)}
                                        >
                                            {data.status === 'active' || data.status === 'trialing' ? 'Manage Subscription' : 'Subscribe'}
                                        </StyledButton>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

AccountDialog.propTypes = {
    show: PropTypes.bool,
    onCancel: PropTypes.func,
    showSubs: PropTypes.func
}

export default AccountDialog
