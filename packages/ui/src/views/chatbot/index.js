import { useEffect, useState } from 'react'
import { FullPageChat } from 'ambientware-embed-react'

// Project import
import LoginDialog from 'ui-component/dialog/LoginDialog'
import { checkApiErrorAndHandleLogin } from '../../api/apiHelpers'

// API
import chatflowsApi from 'api/chatflows'

// Hooks
import useApi from 'hooks/useApi'

//Const
import { baseURL } from 'store/constant'

// ==============================|| Chatbot ||============================== //

const ChatbotFull = () => {
    const URLpath = document.location.pathname.toString().split('/')
    const chatflowId = URLpath[URLpath.length - 1] === 'chatbot' ? '' : URLpath[URLpath.length - 1]

    const [chatflow, setChatflow] = useState(null)
    const [chatbotTheme, setChatbotTheme] = useState({})
    const [loginDialogOpen, setLoginDialogOpen] = useState(false)
    const [loginDialogProps, setLoginDialogProps] = useState({})
    const [isLoading, setLoading] = useState(true)
    const [chatbotOverrideConfig, setChatbotOverrideConfig] = useState({})

    const getSpecificChatflowFromPublicApi = useApi(chatflowsApi.getSpecificChatflowFromPublicEndpoint)
    const getSpecificChatflowApi = useApi(chatflowsApi.getSpecificChatflow)

    useEffect(() => {
        getSpecificChatflowFromPublicApi.request(chatflowId)

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getSpecificChatflowFromPublicApi.error) {
            checkApiErrorAndHandleLogin(getSpecificChatflowFromPublicApi, setLoginDialogProps, setLoginDialogOpen)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSpecificChatflowFromPublicApi.error])

    useEffect(() => {
        if (getSpecificChatflowApi.error) {
            checkApiErrorAndHandleLogin(getSpecificChatflowApi, setLoginDialogProps, setLoginDialogOpen)
        }
    }, [getSpecificChatflowApi.error])

    useEffect(() => {
        if (getSpecificChatflowFromPublicApi.data || getSpecificChatflowApi.data) {
            const chatflowData = getSpecificChatflowFromPublicApi.data || getSpecificChatflowApi.data
            setChatflow(chatflowData)
            if (chatflowData.chatbotConfig) {
                try {
                    const parsedConfig = JSON.parse(chatflowData.chatbotConfig)
                    setChatbotTheme(parsedConfig)
                    if (parsedConfig.overrideConfig) {
                        // Generate new sessionId
                        if (parsedConfig.overrideConfig.generateNewSession) {
                            parsedConfig.overrideConfig.sessionId = Date.now().toString()
                        }
                        setChatbotOverrideConfig(parsedConfig.overrideConfig)
                    }
                } catch (e) {
                    console.error(e)
                    setChatbotTheme({})
                    setChatbotOverrideConfig({})
                }
            }
        }
    }, [getSpecificChatflowFromPublicApi.data, getSpecificChatflowApi.data])

    useEffect(() => {
        setLoading(getSpecificChatflowFromPublicApi.loading || getSpecificChatflowApi.loading)
    }, [getSpecificChatflowFromPublicApi.loading, getSpecificChatflowApi.loading])

    return (
        <>
            {!isLoading ? (
                <>
                    {!chatflow || chatflow.apikeyid ? (
                        <p>Invalid Chatbot</p>
                    ) : (
                        <FullPageChat
                            chatflowid={chatflow.id}
                            apiHost={baseURL}
                            chatflowConfig={chatbotOverrideConfig}
                            theme={{ chatWindow: chatbotTheme }}
                        />
                    )}
                    <LoginDialog show={loginDialogOpen} dialogProps={loginDialogProps} />
                </>
            ) : null}
        </>
    )
}

export default ChatbotFull
