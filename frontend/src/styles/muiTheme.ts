import { createTheme } from '@mui/material/styles';

// MUI theme aligned with the existing spotbuddy.css tokens so MUI controls match the site.
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2b6cf6', dark: '#1c4bb8', light: '#a7c4ff' },
    background: { default: '#f4f7fc', paper: '#ffffff' },
    text: { primary: '#0f223b' },
    divider: '#e4eaf3',
  },
  shape: { borderRadius: 10 },
});
