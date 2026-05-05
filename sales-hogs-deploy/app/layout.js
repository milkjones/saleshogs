import './globals.css'

export const metadata = {
  title: 'Sales Hogs CRM',
  description: 'Made For sales operating system',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
