import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Karting Club México';
const DEFAULT_DESCRIPTION = 'Resultados en tiempo real, parrillas de salida y campeonato de karting en México.';
const DEFAULT_IMAGE = '/karting_club_logo.png';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  jsonLd?: object;
}

export function SEO({ title, description, image, url, type = 'website', jsonLd }: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const metaDescription = description ?? DEFAULT_DESCRIPTION;
  const metaImage = image ?? DEFAULT_IMAGE;
  const canonical = url ? `${window.location.origin}${url}` : window.location.href;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage.startsWith('http') ? metaImage : `${window.location.origin}${metaImage}`} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage.startsWith('http') ? metaImage : `${window.location.origin}${metaImage}`} />

      {/* JSON-LD structured data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
