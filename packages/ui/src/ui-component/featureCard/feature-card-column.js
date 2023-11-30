import { useState } from 'react'
import { PropTypes } from 'prop-types'
import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import { StyledButton } from 'ui-component/button/StyledButton'

const FeatureCardColumn = ({ openDialog, dialogProps }) => {
    const theme = useTheme()

    const [isHovered, setIsHovered] = useState(false)

    const styles = {
        card: {
            backgroundColor: theme.palette.grey[700],
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start', // Adjust to start content from the top
            alignItems: 'flex-start', // Align items to the left
            width: '100%',
            borderColor: 'primary',
            borderRadius: '20px',
            padding: '20px'
        },
        img: {
            alignSelf: 'flex-start', // Align the image itself to the start (left)
            width: '75px',
            marginBottom: 'auto', // Optional, if you want to push all other content to the bottom
            mb: 8,
            borderRadius: '25%'
        },
        wrapper: {
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            textAlign: 'left',
            title: {
                color: 'white',
                lineHeight: 1.4,
                fontWeight: 700
            },
            subTitle: {
                fontSize: 24,
                fontWeight: 400,
                color: 'white'
            }
        }
    }

    const props = {
        title: dialogProps.title,
        content: dialogProps.text,
        image: dialogProps.imgSrc
    }

    return (
        <Box
            sx={styles.card}
            onClick={() => openDialog(props)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Box component={'img'} src={dialogProps.imgSrc} alt={dialogProps.altText} sx={styles.img} />

            <StyledButton
                type='submit'
                sx={{
                    backgroundColor: 'black',
                    ...(isHovered && {
                        backgroundColor: theme.palette['secondary'].main,
                        backgroundImage: `linear-gradient(rgb(0 0 0/10%) 0 0)`
                    })
                }}
                variant='contained'
                color='secondary'
                onClick={() => openDialog(props)}
            >
                {dialogProps.title}
            </StyledButton>

            <Box sx={styles.wrapper}>
                <Typography sx={styles.wrapper.subTitle}>{dialogProps.text}</Typography>
            </Box>
        </Box>
    )
}

FeatureCardColumn.propTypes = {
    openDialog: PropTypes.func,
    dialogProps: PropTypes.object
}

export default FeatureCardColumn
