export const checkApiErrorAndHandleLogin = (apiResponse, setDialogProps, setDialogOpen) => {
    apiResponse.error?.response?.status === 401
        ? (setDialogProps({
              title: 'Login',
              confirmButtonName: 'Login'
          }),
          setDialogOpen(true))
        : null
}
