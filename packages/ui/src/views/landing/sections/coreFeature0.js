import { PropTypes } from 'prop-types'
import { useTheme } from '@mui/material/styles'
import { Container, Box, Typography, Divider } from '@mui/material'

// project imports
import Canvas from '../Canvas'
import { ScrollBar } from 'ui-component/scrollBar/scrollBar'

// models images
import AWS from '../../../assets/images/models/awsBedrock.png'
import Azure from '../../../assets/images/models/Azure.svg'
import Cohere from '../../../assets/images/models/cohere.png'
import GooglePalm from '../../../assets/images/models/Google_PaLM_Logo.svg'
import HuggingFace from '../../../assets/images/models/huggingface.png'
import Openai from '../../../assets/images/models/openai.png'
import Replicate from '../../../assets/images/models/replicate.svg'
import Vertex from '../../../assets/images/models/vertexai.svg'

const images = [
    AWS,
    Azure,
    Cohere,
    GooglePalm,
    HuggingFace,
    Openai,
    Replicate,
    Vertex,
    AWS,
    Azure,
    Cohere,
    GooglePalm,
    HuggingFace,
    Openai,
    Replicate,
    Vertex
]

export default function CoreFeature0() {
    const theme = useTheme()

    return (
        <Box sx={{ pt: 5, pb: 5, alignContent: 'center', backgroundColor: theme.palette.grey[900] }}>
            <ScrollBar images={images} />

            <Divider sx={{ m: 10, borderWidth: 2, width: '90%', borderColor: 'grey' }} />

            <Container maxWidth={'none'} sx={{ width: '80%', mb: 5, justifyContent: 'center' }}>
                <Typography sx={{ color: 'white', fontWeight: 'bold', fontSize: '48px', textAlign: 'center', mx: 'auto' }}>
                    Build and automate AI agents with a component based approach
                </Typography>
            </Container>
            <Container
                display={'flex'}
                maxWidth={'mone'}
                sx={{ width: '90%', height: 875, justifyContent: 'center', backgroundColor: theme.palette.grey[900] }}
            >
                <Box border={'2px solid grey'} sx={{ width: '100%', height: '100%', borderRadius: '30px' }}>
                    <Canvas />
                </Box>
            </Container>
        </Box>
    )
}

CoreFeature0.propTypes = {
    subTitle: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    btnName: PropTypes.string,
    btnURL: PropTypes.string
}
