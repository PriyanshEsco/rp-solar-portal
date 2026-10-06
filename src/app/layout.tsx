import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'R.P. Solar Solution — Enterprise Solar EPC & Operations Portal',
  description: 'Enterprise Operations Portal for R.P. Solar Solution — Solar Project Lifecycle, Multi-tier RBAC, PM Surya Ghar DBT, and Milestone Ledgers.',
  icons: {
    icon: '/images/rp-solar-logo.jpeg',
    apple: '/images/rp-solar-logo.jpeg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
