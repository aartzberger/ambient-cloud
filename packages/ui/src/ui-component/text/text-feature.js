import { PropTypes } from 'prop-types'
import { Box, Typography, Button, Link } from '@mui/material'

export default function TextFeature({ subTitle, title, description, btnName, btnURL = '#' }) {
    return (
        <Box sx={styles.card}>
            <Box sx={styles.wrapper}>
                <Typography sx={styles.wrapper.subTitle}>{subTitle}</Typography>
                <Typography variant='h2' sx={styles.wrapper.title}>
                    {title}
                </Typography>
            </Box>

            {description && (
                <Typography as='p' className='description' sx={styles.description}>
                    {description}
                </Typography>
            )}

            {btnName && (
                <Link href={btnURL} variant='default'>
                    <Button variant='primary' aria-label={btnName}>
                        {btnName}
                    </Button>
                </Link>
            )}
        </Box>
    )
}

TextFeature.propTypes = {
    subTitle: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    btnName: PropTypes.string,
    btnURL: PropTypes.string
}

const styles = {
    card: {
        display: 'flex',
        alignItems: 'flex-start',
        flexDirection: 'column',
        flexShrink: 0,
        a: {
            m: ['0 auto', null, null, 0]
        }
    },
    wrapper: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        mt: '-5px',
        title: {
            fontSize: '24px',
            color: 'heading_secondary',
            lineHeight: [1.35, null, null, 1.3, 1.2],
            fontWeight: '700',
            letterSpacing: '-.5px',
            mb: 5
        },

        subTitle: {
            fontSize: '14px',
            color: 'heading',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            fontWeight: '700',
            mb: [2, null, null, null, 3],
            lineHeight: 1.5
        }
    },
    description: {
        fontSize: '18px',
        fontWeight: 400,
        lineHeight: [1.85, null, null, 2, null, '2.2'],
        color: 'text_secondary',
        mb: '30px'
    }
}
