import { createTheme } from '@mui/material/styles';

// MUI theme aligned with the spotsteer.css tokens so MUI controls (the charts and the
// contact dialog) match the site. Values are literals because MUI resolves the palette
// in JS and cannot read a CSS custom property; they mirror :root exactly.
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#3fa8d1', dark: '#12586f', light: '#63bcdd' },
    secondary: { main: '#e8952b', light: '#f2ab52' },
    background: { default: '#0f1418', paper: '#161d23' },
    text: { primary: '#e8edf1', secondary: '#a7b4bf' },
    divider: '#26313a',
  },
  shape: { borderRadius: 10 },
  typography: { fontFamily: "'Space Grotesk', system-ui, sans-serif" },
});
