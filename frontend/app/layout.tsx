import React from 'react';

export const metadata = {
  title: 'TEMS - Test Environment Management System',
  description: 'Manage test environments efficiently',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
