import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata = {
  title: 'Envify',
  description: 'Enterprise Test Environment Management and Orchestration Platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
            <Toaster position="top-right" />
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
