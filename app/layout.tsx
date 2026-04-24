import { Cinzel, Lato, Fredoka, Quicksand } from 'next/font/google';
import "../styles/globals.css";
import NeonLineLoader from "./NeonLineLoader";
import MouseComponent from "./mouse";

const cinzel = Cinzel({ subsets: ['latin'], display: 'swap', variable: '--font-cinzel', weight: ['400', '600'] });
const lato = Lato({ subsets: ['latin'], display: 'swap', variable: '--font-lato', weight: ['300', '400'] });
const fredoka = Fredoka({ subsets: ['latin'], display: 'swap', variable: '--font-fredoka', weight: ['400', '700'] });
const quicksand = Quicksand({ subsets: ['latin'], display: 'swap', variable: '--font-quicksand', weight: ['300', '500', '700'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`bg-black text-white ${cinzel.variable} ${lato.variable} ${fredoka.variable} ${quicksand.variable}`}>
      <head>
        <title>Ghibli Studio Website</title>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="A magical Ghibli-inspired studio website built with Next.js"
        />

  {/* Browser bar color (Android Chrome, Windows) */}
  <meta name="theme-color" content="#00008B" />
  <meta name="msapplication-navbutton-color" content="##00008B" />
  {/* iOS Safari status bar color (only works when added to home screen) */}
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-title" content="Ghibli Studio Website" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="font-sans">
        <NeonLineLoader />
         <MouseComponent />
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}
