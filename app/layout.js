export const metadata = {
  title: "HAYAT - Emergency First Aid Assistant",
  description: "AI-Powered instant emergency guide in Urdu & English",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ur">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&family=Inter:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          .font-urdu { font-family: 'Noto Nastaliq Urdu', serif; }
          .font-inter { font-family: 'Inter', sans-serif; }
        `}</style>
      </head>
      <body className="bg-slate-900 text-slate-100 min-h-screen font-inter antialiased">
        {children}
      </body>
    </html>
  );
}
