import { PropTypes } from 'prop-types'
import { useEffect, useRef } from 'react'
import { Box } from '@mui/material'

export const ScrollBar = ({ images }) => {
    const scrollRef = useRef(null)

    useEffect(() => {
        const interval = setInterval(() => {
            if (scrollRef.current) {
                const maxScrollLeft = scrollRef.current.scrollWidth - scrollRef.current.clientWidth
                if (scrollRef.current.scrollLeft >= maxScrollLeft) {
                    scrollRef.current.scrollLeft = 0
                } else {
                    scrollRef.current.scrollLeft += 2 // Adjust for speed
                }
            }
        }, 50) // Adjust for interval

        return () => clearInterval(interval)
    }, [])

    return (
        <Box
            ref={scrollRef}
            sx={{
                overflowX: 'hidden', // Hide horizontal scrollbar
                display: 'flex',
                gap: 15,
                p: 1,
                '&::-webkit-scrollbar': {
                    display: 'none' // For webkit browsers
                }
            }}
        >
            {images.map((image, index) => (
                <Box component='img' key={index} src={image} alt={`image-${index}`} sx={{ width: 75, height: 75, objectFit: 'cover' }} />
            ))}
        </Box>
    )
}

ScrollBar.propTypes = {
    images: PropTypes.array
}
