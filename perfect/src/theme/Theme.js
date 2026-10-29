import _ from 'lodash';
import { createTheme } from '@mui/material/styles';
import { useSelector } from 'react-redux';
import { useEffect, useMemo } from 'react';
import components from './Components';
import typography from './Typography';
import { shadows, darkshadows } from './Shadows';
import { DarkThemeColors } from './DarkThemeColors';
import { LightThemeColors } from './LightThemeColors';
import * as locales from '@mui/material/locale';
import { baseDarkTheme, baselightTheme } from './DefaultColors';

export const BuildTheme = (config = {}) => {
  const themeOptions = LightThemeColors.find((theme) => theme.name === config.theme);
  const darkthemeOptions = DarkThemeColors.find((theme) => theme.name === config.theme);
  const customizer = useSelector((state) => state.customizer);
  const defaultTheme = customizer.activeMode === 'dark' ? baseDarkTheme : baselightTheme;
  const defaultShadow = customizer.activeMode === 'dark' ? darkshadows : shadows;
  const themeSelect = customizer.activeMode === 'dark' ? darkthemeOptions : themeOptions;

  const baseMode = {
    palette: {
      mode: customizer.activeMode,
    },
    shape: {
      borderRadius: customizer.borderRadius,
    },  
    shadows: defaultShadow,
    typography: typography,
  };
  const theme = createTheme(
    _.merge({}, baseMode, defaultTheme, locales[customizer.isLanguage], themeSelect, {
      direction: config.direction,
    }),
  );
  theme.components = components(theme);

  return theme;
};

const ThemeSettings = () => {
  const activDir = useSelector((state) => state.customizer.activeDir);
  const activeTheme = useSelector((state) => state.customizer.activeTheme);
  const activeMode = useSelector((state) => state.customizer.activeMode);
  const borderRadius = useSelector((state) => state.customizer.borderRadius);
  const isLanguage = useSelector((state) => state.customizer.isLanguage);

  const theme = useMemo(() => {
    const themeOptions = LightThemeColors.find((theme) => theme.name === activeTheme);
    const darkthemeOptions = DarkThemeColors.find((theme) => theme.name === activeTheme);
    const defaultTheme = activeMode === 'dark' ? baseDarkTheme : baselightTheme;
    const defaultShadow = activeMode === 'dark' ? darkshadows : shadows;
    const themeSelect = activeMode === 'dark' ? darkthemeOptions : themeOptions;

    const baseMode = {
      palette: {
        mode: activeMode,
      },
      shape: {
        borderRadius: borderRadius,
      },
      shadows: defaultShadow,
      typography: typography,
    };
    const t = createTheme(
      _.merge({}, baseMode, defaultTheme, locales[isLanguage], themeSelect, {
        direction: activDir,
      }),
    );
    t.components = components(t);
    return t;
  }, [activDir, activeTheme, activeMode, borderRadius, isLanguage]);

  useEffect(() => {
    document.dir = activDir;
  }, [activDir]);

  return theme;
};

export { ThemeSettings };
