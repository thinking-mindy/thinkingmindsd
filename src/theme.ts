'use client';
import { createTheme } from '@mui/material/styles';
import { Roboto } from 'next/font/google';
import { inputsCustomizations } from '@/shared-theme/customizations/inputs';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0AA775',
      light: 'hsl(161, 65%, 72%)',
      dark: 'hsl(161, 65%, 22%)',
      contrastText: '#ffffff',
    },
  },
  typography: {
    fontFamily: roboto.style.fontFamily,
  },
  components: inputsCustomizations,
});

export default theme;
