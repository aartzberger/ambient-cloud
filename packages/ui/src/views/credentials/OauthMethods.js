import { StyledButton } from 'ui-component/button/StyledButton'

const GoogleOauth2 = ({ onConfirm }) => {
    async function authorizeWithOAuth2() {
        const authorizationUrl = `${process.env.BASE_URL}/api/v1/oauth/google` || `https://app-ambient.ngrok.app/api/v1/oauth/google`

        const authWindow = window.open(authorizationUrl, 'Authorization', 'width=600,height=400')

        // Check if the window was opened successfully.
        if (!authWindow || authWindow.closed || typeof authWindow.closed === 'undefined') {
            console.error('Authorization window could not be opened. Please check if popups are enabled.')
            return
        }

        const checkInterval = setInterval(() => {
            // To handle cross-origin restrictions, we'll use a try-catch block.
            try {
                if (authWindow.closed) {
                    clearInterval(checkInterval)

                    // TODO CMAN - need to add snack bar
                    onConfirm()
                }
            } catch (e) {
                console.error('Error while checking the authorization window:', e)
                // If you can't access the window due to security restrictions, you might decide to clear the interval.
                clearInterval(checkInterval)
            }
        }, 500)
    }

    return (
        <StyledButton variant='contained' onClick={async () => await authorizeWithOAuth2()}>
            Connect
        </StyledButton>
    )
}

GoogleOauth2.propTypes = {
    onConfirm: PropTypes.func
}

export default GoogleOauth2
