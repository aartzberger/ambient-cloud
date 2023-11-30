export const LandingStyles = {
    pixelGridContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        borderRadius: '20%'
    },
    contentContainer: {
        position: 'relative',
        zIndex: 1, // Ensures content is above the pixel grid
        pointerEvents: 'none'
    },
    interactiveElement: {
        pointerEvents: 'auto' // Ensures interactive elements can be clicked
    },
    grid: {
        // px: [0, null, null, "60px", null, "90px"],
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'stretch',
        flexDirection: 'row',
        gridGap: ['350px 50px', null, '100px 200x'],
        gridTemplateColumns: ['repeat(1,1fr)', null, 'repeat(2,1fr)', null, 'repeat(3,1fr)', null, 'repeat(4,1fr)'],
        // mx: 'auto',
        m: 3
    },
    models: {
        pt: '50px',
        width: ['100%', '100%', '100%'],
        mx: 'auto'
    }
}
