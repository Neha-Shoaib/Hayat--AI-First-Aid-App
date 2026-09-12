import './globals.css';

export const metadata = {
  title: "HAYAT AI - Emergency",
  description: "Emergency First Aid Assistant",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ur" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&family=Inter:wght@400;600;800&display=swap" rel="stylesheet" />
        <style>{`
          .font-urdu { font-family: 'Noto Nastaliq Urdu', serif; direction: rtl; }
          .font-inter { font-family: 'Inter', sans-serif; }
        `}</style>
      </head>
      <body className="antialiased font-inter m-0 p-0 overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
