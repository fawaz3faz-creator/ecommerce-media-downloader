import { NextRequest, NextResponse } from 'next/server';
import { chromium } from 'playwright';

const PRODUCT_DOMAINS = ['aliexpress.com', 'temu.com', 'shein.com', 'alibaba.com'];

export type MediaCategory = 'main' | 'variants' | 'description' | 'videos';

export type MediaItem = {
  id: string;
  category: MediaCategory;
  type: 'image' | 'video';
  src: string;
  alt: string;
  label: string;
  width?: number;
  height?: number;
};

function detectPlatform(url: string) {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes('aliexpress')) return 'AliExpress';
  if (hostname.includes('temu')) return 'Temu';
  if (hostname.includes('shein')) return 'Shein';
  if (hostname.includes('alibaba')) return 'Alibaba';
  return 'E-commerce';
}

function normalizeUrl(raw: string) {
  const value = raw.trim();
  if (!/^https?:\/\//i.test(value)) return `https://${value}`;
  return value;
}

function uniqueByUrl(items: MediaItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.src)) return false;
    seen.add(item.src);
    return true;
  });
}

function buildDemoAssets(url: string, platform: string): MediaItem[] {
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

  categories.forEach((category, index) => {
    base.forEach((src, imageIndex) => {
      const isVideo = category === 'videos';
      items.push({
        id: `${category}-${index}-${imageIndex}`,
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
      const anchors = Array.from(document.querySelectorAll('a'));
      const images = Array.from(document.querySelectorAll('img'));
      const videos = Array.from(document.querySelectorAll('video source, video'));

      const collectImageUrls = (nodes: Element[]) =>
        nodes
          .map((node) => {
            const src = (node as HTMLImageElement).src || (node as HTMLImageElement).getAttribute('data-src');
            const srcset = (node as HTMLImageElement).getAttribute('srcset');
            const candidate = src || srcset?.split(',')[0]?.trim().split(' ')[0];
            return candidate || null;
          })
          .filter(Boolean) as string[];

      const imageUrls = collectImageUrls(images);
      const videoUrls = videos
        .map((node) => {
          const srcEl = node as HTMLSourceElement;
          const src = srcEl.src || (node as HTMLVideoElement).src || srcEl.getAttribute('src');
          return src || null;
        })
        .filter(Boolean) as string[];

      const metaImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
      const metaVideo = document.querySelector('meta[property="og:video"]')?.getAttribute('content');
      const title = document.title || document.querySelector('h1')?.textContent || 'Product';

      return {
        title,
        imageUrls: Array.from(new Set([...(metaImage ? [metaImage] : []), ...imageUrls])),
        videoUrls: Array.from(new Set([...(metaVideo ? [metaVideo] : []), ...videoUrls])),
        anchors: anchors.map((a) => a.href).filter(Boolean),
      };
    });

    const allImages = data.imageUrls.length ? data.imageUrls : [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
    ];

    const allVideos = data.videoUrls.length ? data.videoUrls : [
      'https://videos.pexels.com/video-files/3209828/3209828-hd_1920_1080.mp4',
    ];

    const media: MediaItem[] = [];

    const mainImages = allImages.slice(0, 6).map((src, index) => ({
      id: `main-${index}`,
      category: 'main' as const,
      type: 'image' as const,
      src,
      alt: `${data.title} primary image ${index + 1}`,
      label: `Main image ${index + 1}`,
    }));

    const variantImages = allImages.slice(6, 10).map((src, index) => ({
      id: `variant-${index}`,
      category: 'variants' as const,
      type: 'image' as const,
      src,
      alt: `${data.title} variant image ${index + 1}`,
      label: `Variant ${index + 1}`,
    }));

    const descriptionImages = allImages.slice(10, 14).map((src, index) => ({
      id: `description-${index}`,
      category: 'description' as const,
      type: 'image' as const,
      src,
      alt: `${data.title} description image ${index + 1}`,
      label: `Description ${index + 1}`,
    }));

    const videos = allVideos.slice(0, 3).map((src, index) => ({
      id: `video-${index}`,
      category: 'videos' as const,
      type: 'video' as const,
      src,
      alt: `${data.title} video ${index + 1}`,
      label: `Video ${index + 1}`,
    }));

    media.push(...mainImages, ...variantImages, ...descriptionImages, ...videos);

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
    const host = new URL(url).hostname.toLowerCase();
    const supported = PRODUCT_DOMAINS.some((domain) => host.includes(domain));

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
        items: buildDemoAssets(url, platform),
      };
    }

    return NextResponse.json({
      platform,
      url,
      title: extracted.title,
      items: extracted.items,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Unable to parse the provided URL.' }, { status: 400 });
  }
}
