import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'Secure Local Diff Checker - Compare Files & Folders Privately',
  description: 'A completely local, browser-based diff tool for comparing text, files, and folders securely. No downloads, full privacy, everything runs in your browser.',
  keywords: ['diff checker', 'local diff', 'secure diff tool', 'compare files online', 'folder comparison', 'privacy focused diff'],
  openGraph: {
    title: 'Secure Local Diff Checker',
    description: 'Compare text, files, and folders securely in your browser. No data uploads.',
    type: 'website',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
