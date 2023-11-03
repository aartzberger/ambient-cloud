import logoWhite from 'assets/images/ambientware_white.png'
import logoBlack from 'assets/images/ambientware_black.png'

import { useSelector } from 'react-redux'

// ==============================|| LOGO ||============================== //

const Logo = () => {
    const customization = useSelector((state) => state.customization)

    return (
        <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'row' }}>
            <img
                style={{ objectFit: 'contain', height: 'auto', width: 150 }}
                src={customization.isDarkMode ? logoWhite : logoBlack}
                alt='AmbientWare'
            />
        </div>
    )
}

export default Logo
