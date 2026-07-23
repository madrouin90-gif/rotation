import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemePicker } from "@/components/theme/ThemePicker";
import { ServiceWorkerRegister } from "@/components/push/ServiceWorkerRegister";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rotation",
  description: "Partage musical, en groupe.",
};

// Pose l'attribut data-theme avant l'hydratation React pour éviter un flash du
// mauvais thème au chargement (le localStorage n'est lisible que côté client).
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('rotation.theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${spaceGrotesk.variable} ${inter.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
          <ThemePicker />
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
