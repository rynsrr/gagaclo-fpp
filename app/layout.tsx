import type { Metadata } from 'next';
import { Great_Vibes, Dancing_Script, Roboto_Condensed } from 'next/font/google';
import './globals.css';

const greatVibes = Great_Vibes({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-great-vibes',
  display: 'swap',
});

const dancingScript = Dancing_Script({
  weight: ['600', '700'],
  subsets: ['latin'],
  variable: '--font-dancing-script',
  display: 'swap',
});

const robotoCondensed = Roboto_Condensed({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-condensed',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Formulir Permohonan Pembelian | PT GAGACLO',
  description: 'Aplikasi Pembuatan & Pencetakan Formulir Permohonan Pembelian (FPP) PT GAGACLO terintegrasi Supabase, GitHub, dan Vercel.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`dark ${greatVibes.variable} ${dancingScript.variable} ${robotoCondensed.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Great+Vibes&family=Roboto+Condensed:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('gagaclo_theme');
                  var isDark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-[#08090C] text-slate-900 dark:text-[#F5F5F7] transition-colors duration-200 selection:bg-slate-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
        {children}
      </body>
    </html>
  );
}
