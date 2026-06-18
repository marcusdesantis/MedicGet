import { useEffect } from 'react';

interface SeoMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  keywords?: string;
}

export function useSeoMeta({ title, description, canonical, ogImage, keywords }: SeoMeta) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    const injected: HTMLElement[] = [];

    const addMeta = (attrs: Record<string, string>) => {
      const el = document.createElement('meta');
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
      injected.push(el);
    };

    const addLink = (attrs: Record<string, string>) => {
      const el = document.createElement('link');
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
      injected.push(el);
    };

    addMeta({ name: 'description', content: description });
    if (keywords) addMeta({ name: 'keywords', content: keywords });

    // Open Graph
    addMeta({ property: 'og:type',        content: 'website' });
    addMeta({ property: 'og:title',       content: title });
    addMeta({ property: 'og:description', content: description });
    addMeta({ property: 'og:url',         content: canonical });
    addMeta({ property: 'og:site_name',   content: 'MedicGet' });
    addMeta({ property: 'og:locale',      content: 'es_EC' });
    if (ogImage) addMeta({ property: 'og:image', content: ogImage });

    // Twitter Card
    addMeta({ name: 'twitter:card',        content: 'summary_large_image' });
    addMeta({ name: 'twitter:title',       content: title });
    addMeta({ name: 'twitter:description', content: description });
    addMeta({ name: 'twitter:site',        content: '@MedicGet' });
    if (ogImage) addMeta({ name: 'twitter:image', content: ogImage });

    // Canonical
    addLink({ rel: 'canonical', href: canonical });

    return () => {
      document.title = prevTitle;
      injected.forEach(el => el.parentNode?.removeChild(el));
    };
  }, [title, description, canonical, ogImage, keywords]);
}
