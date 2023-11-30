import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { createPortal } from 'react-dom'
import {
    Dialog,
    DialogContent,
    DialogTitle,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Paper,
    Typography
} from '@mui/material'
import subscriptions from 'api/subscriptions'

const SubscriptionDialog = ({ show, onCancel }) => {
    const portalElement = document.getElementById('portal')
    const [options, setOptions] = useState([]) // Initialized as an array

    useEffect(() => {
        subscriptions
            .getSubscriptionOptions() // Assuming this returns a promise
            .then((fetchedOptions) => {
                setOptions(fetchedOptions.data) // Set the options state
            })
            .catch((error) => {
                console.error('Error fetching subscription options:', error)
            })
    }, [show])

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
                Plans and Pricing
            </DialogTitle>
            <DialogContent>
                <TableContainer component={Paper}>
                    <Table aria-label='simple table'>
                        <TableHead>
                            <TableRow>
                                {options &&
                                    options.map((option) => (
                                        <TableCell sx={{ textAlign: 'center' }} key={option.priceId}>
                                            {option.name}
                                        </TableCell>
                                    ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                {options &&
                                    options.map((option) => (
                                        <TableCell sx={{ alignContent: 'center' }} key={option.priceId} component='th' scope='row'>
                                            <ProductDisplay option={option} />
                                        </TableCell>
                                    ))}
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
        </Dialog>
    ) : null

    return portalElement ? createPortal(component, portalElement) : null
}

SubscriptionDialog.propTypes = {
    show: PropTypes.bool.isRequired,
    onCancel: PropTypes.func.isRequired
}

export default SubscriptionDialog

const ProductDisplay = ({ option }) => {
    // Corrected to destructure the option prop

    const handleSubmit = async (event) => {
        event.preventDefault() // Prevent the default form submission
        const form = event.target
        const priceId = form.lookup_key.value

        try {
            await subscriptions
                .postSubscriptionCheckoutSession({ priceId: priceId }) // Assuming this returns a promise
                .then((response) => {
                    window.location = response.data.url
                })
                .catch((error) => {
                    console.error('Error fetching subscription options:', error)
                })

            // Redirect or update state here
        } catch (error) {
            // Handle errors
            console.error('Error:', error)
        }
    }

    return (
        <section>
            <div className='product'>
                {/* <Logo /> */}
                <Typography> {option.description} </Typography>
                {option.features.map((feature, index) => (
                    <Typography sx={{ m: 2 }} key={index}>
                        {' '}
                        {`✓ ${feature.name}`}{' '}
                    </Typography>
                ))}
                <div className='description'>
                    <h5>{`${option.price} / ${option.recurring ? 'month' : 'one time'}`}</h5>{' '}
                </div>
            </div>
        </section>
    )
}

ProductDisplay.propTypes = {
    option: PropTypes.shape({
        name: PropTypes.string,
        price: PropTypes.string,
        description: PropTypes.string,
        recurring: PropTypes.string,
        priceId: PropTypes.string,
        status: PropTypes.string,
        current: PropTypes.bool,
        features: PropTypes.array
        // Add any other properties that option is expected to have
    }).isRequired
}
