import { useSelector } from 'react-redux';
import { Link } from 'react-router';
import LogoDark from 'src/assets/images/logos/dark-logo.svg?react';
import LogoDarkRTL from 'src/assets/images/logos/dark-rtl-logo.svg?react';
import LogoLight from 'src/assets/images/logos/light-logo.svg?react';
import LogoLightRTL from 'src/assets/images/logos/light-logo-rtl.svg?react';
import { styled } from '@mui/material';

const Logo = () => {
  const customizer = useSelector((state) => state.customizer);
  const LinkStyled = styled(Link)(() => ({
    height: customizer.TopbarHeight,
    width: customizer.isCollapse ? '40px' : '180px',
    overflow: 'hidden',
    display: 'block',
  }));

  if (customizer.activeDir === 'ltr') {
    return (
      <LinkStyled to="/" style={{
        display: 'flex',
        alignItems: 'center',
      }}>
        {customizer.activeMode === 'dark' ? (
          <LogoLight />
        ) : (
          <LogoDark />
        )}
      </LinkStyled>
    );
  }
  return (
    <LinkStyled to="/" style={{
      display: 'flex',
      alignItems: 'center',
    }}>
      {customizer.activeMode === 'dark' ? (
        <LogoDarkRTL />
      ) : (
        <LogoLightRTL />
      )}
    </LinkStyled>
  );
};

export default Logo;
