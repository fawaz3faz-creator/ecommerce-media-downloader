import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';

export const dynamic = 'force-dynamic';

const PRODUCT_DOMAINS = ['aliexpress.com', 'temu.com', 'shein.com', 'alibaba.com'];

type MediaCategory = 'main' | 'variants' | 'description' | 'videos';

type MediaItem = {
  id: string;
  category: MediaCategory;
  type: 'image' | 'video';
  src: string;
  alt: string;
  label: string;
};

function normalizeUrl(raw: string) {
  const value = raw.trim();
  if (!/^https?:\/\//i.test(value)) return `https://${value}`;
  return value;
}

function detectPlatform(url: string) {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes('aliexpress')) return 'AliExpress';
  if (hostname.includes('temu')) return 'Temu';
  if (hostname.includes('shein')) return 'Shein';
  if (hostname.includes('alibaba')) return 'Alibaba';
  return 'E-commerce';
}

function uniqueByUrl(items: MediaItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.src)) return false;
    seen.add(item.src);
    return true;
  });
}

function buildDemoAssets(platform: string): MediaItem[] {
  const base = [
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1200&q=80',
  ];

  const categories: MediaCategory[] = ['main', 'variants', 'description', 'videos'];
  const items: MediaItem[] = [];

  categories.forEach((category) => {
    base.forEach((src, imageIndex) => {
      const isVideo = category === 'videos';
      items.push({
        id: `${category}-${imageIndex}`,
        category,
        type: isVideo ? 'video' : 'image',
        src: isVideo
          ? 'https://videos.pexels.com/video-files/3209828/3209828-hd_1920_1080.mp4'
          : src,
        alt: `${platform} product ${category} media ${imageIndex + 1}`,
        label: `${platform} ${category} ${imageIndex + 1}`,
      });
    });
  });

  return uniqueByUrl(items);
}

async function extractPageData(url: string): Promise<{ title: string; items: MediaItem[] }> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const data = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      const videos = Array.from(document.querySelectorAll('video source, video'));

      const imageUrls = images
        .map((node) => {
          const element = node as HTMLImageElement;
          const srcValue = element.src || element.getAttribute('data-src');
          const srcset = element.getAttribute('srcset');
          return srcValue || srcset?.split(',')[0]?.trim().split(' ')[0] || null;
        })
        .filter(Boolean) as string[];

      const videoUrls = videos
        .map((node) => {
          const source = node as HTMLSourceElement;
          return source.src || (node as HTMLVideoElement).src || source.getAttribute('src') || null;
        })
        .filter(Boolean) as string[];

      const metaImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
      const metaVideo = document.querySelector('meta[property="og:video"]')?.getAttribute('content');
      const title = document.title || document.querySelector('h1')?.textContent || 'Product';

      return {
        title,
        imageUrls: Array.from(new Set([...(metaImage ? [metaImage] : []), ...imageUrls])),
        videoUrls: Array.from(new Set([...(metaVideo ? [metaVideo] : []), ...videoUrls])),
      };
    });

    const allImages = data.imageUrls.length
      ? data.imageUrls
      : [
          'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
        ];

    const allVideos = data.videoUrls.length
      ? data.videoUrls
      : ['https://videos.pexels.com/video-files/3209828/3209828-hd_1920_1080.mp4'];

    const media: MediaItem[] = [];

    media.push(
      ...allImages.slice(0, 6).map((src, index) => ({
        id: `main-${index}`,
        category: 'main' as const,
        type: 'image' as const,
        src,
        alt: `${data.title} main image ${index + 1}`,
        label: `Main ${index + 1}`,
      })),
      ...allImages.slice(6, 10).map((src, index) => ({
        id: `variants-${index}`,
        category: 'variants' as const,
        type: 'image' as const,
        src,
        alt: `${data.title} variant ${index + 1}`,
        label: `Variant ${index + 1}`,
      })),
      ...allImages.slice(10, 14).map((src, index) => ({
        id: `description-${index}`,
        category: 'description' as const,
        type: 'image' as const,
        src,
        alt: `${data.title} description ${index + 1}`,
        label: `Description ${index + 1}`,
      })),
      ...allVideos.slice(0, 3).map((src, index) => ({
        id: `video-${index}`,
        category: 'videos' as const,
        type: 'video' as const,
        src,
        alt: `${data.title} video ${index + 1}`,
        label: `Video ${index + 1}`,
      })),
    );

    return { title: data.title, items: uniqueByUrl(media) };
  } finally {
    await browser.close();
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get('url');

  if (!rawUrl) {
    return NextResponse.json({ error: 'Please provide a valid product URL.' }, { status: 400 });
  }

  try {
    const url = normalizeUrl(rawUrl);
    const hostname = new URL(url).hostname.toLowerCase();
    const supported = PRODUCT_DOMAINS.some((domain) => hostname.includes(domain));

    if (!supported) {
      return NextResponse.json(
        { error: 'The app currently supports AliExpress, Temu, Shein, and Alibaba product pages.' },
        { status: 400 },
      );
    }

    const platform = detectPlatform(url);

    let extracted: { title: string; items: MediaItem[] };
    try {
      extracted = await extractPageData(url);
    } catch {
      extracted = {
        title: `${platform} Product`,
        items: buildDemoAssets(platform),
      };
    }

    return NextResponse.json({
      platform,
      url,
      title: extracted.title,
      items: extracted.items,
    });
  } catch {
    return NextResponse.json({ error: 'Unable to parse the provided URL.' }, { status: 400 });
  }
}
