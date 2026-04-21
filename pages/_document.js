import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head>
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="JL Jurisprudência" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="JL Juris" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#1a1a2e" />
        <meta name="msapplication-TileColor" content="#1a1a2e" />
        <meta name="format-detection" content="telephone=no" />

        {/* Icons */}
        <link rel="icon" type="image/svg+xml" href="/icons/icon-192.svg" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />

        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
