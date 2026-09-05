import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { WaveBackground } from "@/components/WaveBackground";

export const metadata: Metadata = {
  title: "CipherCrew - Fruit Adulteration Detector",
  description: "Scan to Know Whether You Are Eating a Fruit or Chemicals. Powered by CipherCrew AI.",
  icons: {
    icon: [
      {
        url: "/logo-light.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/logo-dark.png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/logo-light.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#090d16" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black" suppressHydrationWarning>
      <head>
        <link id="dynamic-favicon" rel="icon" type="image/png" href="/logo-light.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = saved === 'dark' || (!saved && prefersDark) || (saved === 'system' && prefersDark);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                  var fav = document.getElementById('dynamic-favicon');
                  if (fav) {
                    fav.href = isDark ? '/logo-dark.png' : '/logo-light.png';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="bg-background text-primary min-h-screen flex flex-col font-sans transition-colors duration-300 relative overflow-x-hidden w-full max-w-[100vw]">
        <ThemeProvider>
          <WaveBackground />
          <div className="relative z-10 flex flex-col min-h-screen w-full overflow-x-hidden">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

