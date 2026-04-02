import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://distsim.dev', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: 'https://distsim.dev/labs', lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: 'https://distsim.dev/learn', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  ];
}
