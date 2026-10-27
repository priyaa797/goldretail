import { useSelector } from 'react-redux';
import { Link } from 'react-router';
import LogoDark from 'src/assets/images/logos/dark-logo.svg?react';
import LogoDarkRTL from 'src/assets/images/logos/dark-rtl-logo.svg?react';
import LogoLight from 'src/assets/images/logos/light-logo.svg?react';
import LogoLightRTL from 'src/assets/images/logos/light-logo-rtl.svg?react';
import LogoIcon from 'src/assets/images/logos/logo-icon.svg?react';
import { styled } from '@mui/material';

const Logo = () => {
  const customizer = useSelector((state) => state.customizer);
  const isMini = customizer.isCollapse && !customizer.isSidebarHover;

  const LinkStyled = styled(Link)(() => ({
    height: customizer.TopbarHeight,
    width: isMini ? '40px' : '180px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: isMini ? 'center' : 'flex-start',
    textDecoration: 'none',
  }));

  if (isMini) {
    return (
      <LinkStyled to="/">
        <LogoIcon style={{ width: '36px', height: '36px' }} />
      </LinkStyled>
    );
  }

  if (customizer.activeDir === 'ltr') {
    return (
      <LinkStyled to="/">
        {customizer.activeMode === 'dark' ? (
          <LogoLight style={{ maxHeight: '46px', maxWidth: '175px', width: 'auto', height: 'auto' }} />
        ) : (
          <LogoDark style={{ maxHeight: '46px', maxWidth: '175px', width: 'auto', height: 'auto' }} />
        )}
      </LinkStyled>
    );
  }
  return (
    <LinkStyled to="/">
      {customizer.activeMode === 'dark' ? (
        <LogoDarkRTL style={{ maxHeight: '46px', maxWidth: '175px', width: 'auto', height: 'auto' }} />
      ) : (
        <LogoLightRTL style={{ maxHeight: '46px', maxWidth: '175px', width: 'auto', height: 'auto' }} />
      )}
    </LinkStyled>
  );
};

export default Logo;
