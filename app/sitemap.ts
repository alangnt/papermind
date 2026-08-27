import { MetadataRoute } from 'next';

// Only public, indexable routes belong here. /profile and /reset_password are
// noindex (see their layouts) and are deliberately omitted.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://www.papermind.ch',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
