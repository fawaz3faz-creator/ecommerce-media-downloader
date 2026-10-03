"use client";

import { useMemo, useState } from 'react';
import JSZip from 'jszip';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Download,
  Image as ImageIcon,
  Layers3,
  Link2,
  Loader2,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Video,
} from 'lucide-react';

type MediaCategory = 'main' | 'variants' | 'description' | 'videos';

type MediaItem = {
  id: string;
  category: MediaCategory;
  type: 'image' | 'video';
  src: string;
  alt: string;
  label: string;
};

const TABS: { id: MediaCategory; label: string }[] = [
  { id: 'main', label: 'Main' },
  { id: 'variants', label: 'Variants' },
  { id: 'description', label: 'Description' },
  { id: 'videos', label: 'Videos' },
];

const FEATURE_ITEMS = [
  {
    title: 'Instant extraction',
    text: 'Render JS-heavy storefront pages and collect product media without messy manual downloading.',
  },
  {
    title: 'Structured categories',
    text: 'Group main gallery assets, variants, product description images, and videos into clear sections.',
  },
  {
    title: 'Bulk ZIP downloads',
    text: 'Select what you want and export a neatly organized archive with folders for each media type.',
  },
];

const sampleUrls = [
  'https://www.aliexpress.com/item/100500...',
  'https://www.temu.com/...',
  'https://www.shein.com/...',
];

function makeFileName(url: string, fallback: string) {
  try {
    const pathname = new URL(url).pathname;
    const raw = pathname.split('/').filter(Boolean).pop() || fallback;
    return raw.replace(/[\\/:*?"<>|]+/g, '-').toLowerCase();
  } catch {
    return fallback;
  }
}

export default function HomePage() {
  const [url, setUrl] = useState('https://www.aliexpress.com/item/1005006098452220.html');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [platform, setPlatform] = useState('');
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [activeTab, setActiveTab] = useState<MediaCategory>('main');
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});

  const visibleItems = useMemo(
    () => items.filter((item) => item.category === activeTab),
    [items, activeTab],
  );

  const visibleSelected = visibleItems.filter((item) => selectedMap[item.id]);
  const totalSelected = Object.values(selectedMap).filter(Boolean).length;

  const handleExtract = async () => {
    const cleaned = url.trim();
    if (!cleaned) {
      setError('Please enter a product URL.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/extract?url=${encodeURIComponent(cleaned)}`);
      const data = await response.json();

      if (!response.ok || !data.items) {
        throw new Error(data.error || 'Unable to extract media.');
      }

      setPlatform(data.platform || 'E-commerce');
      setTitle(data.title || 'Product media');
      setItems(data.items || []);
      setSelectedMap({});
      setActiveTab('main');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to extract media.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedMap((current) => ({ ...current, [id]: !current[id] }));
  };

  const toggleAllVisible = () => {
    const shouldSelect = visibleSelected.length !== visibleItems.length;
    const next = visibleItems.reduce<Record<string, boolean>>((acc, item) => {
      acc[item.id] = shouldSelect;
      return acc;
    }, {});

    setSelectedMap((current) => ({
      ...current,
      ...next,
    }));
  };

  const downloadSingle = async (item: MediaItem) => {
    try {
      const response = await fetch(item.src);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = makeFileName(item.src, `${item.label}.${item.type === 'video' ? 'mp4' : 'jpg'}`);
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      const link = document.createElement('a');
      link.href = item.src;
      link.download = makeFileName(item.src, `${item.label}.${item.type === 'video' ? 'mp4' : 'jpg'}`);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    }
  };

  const downloadSelectedZip = async () => {
    if (!totalSelected) return;

    const zip = new JSZip();
    const selectedItems = items.filter((item) => selectedMap[item.id]);

    for (const item of selectedItems) {
      const response = await fetch(item.src);
      const blob = await response.blob();
      const fileName = makeFileName(item.src, `${item.label}.${item.type === 'video' ? 'mp4' : 'jpg'}`);
      zip.folder(item.category)?.file(fileName, blob);
    }

    const archive = await zip.generateAsync({ type: 'blob' });
    const urlObj = URL.createObjectURL(archive);
    const anchor = document.createElement('a');
    anchor.href = urlObj;
    anchor.download = 'selected-media.zip';
    anchor.click();
    URL.revokeObjectURL(urlObj);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <nav className="glass flex items-center justify-between rounded-full px-4 py-3 shadow-glow md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 font-black text-slate-950">
              A
            </div>
            <div>
              <div className="text-lg font-bold">AliDown</div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Media Suite</div>
            </div>
          </div>

          <div className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#process" className="transition hover:text-white">How it works</a>
            <a href="#gallery" className="transition hover:text-white">Gallery</a>
          </div>

          <button className="rounded-full border border-cyan-400/50 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300">
            Start Free
          </button>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-8 md:grid-cols-[1.1fr_0.9fr] md:px-8 md:pt-12">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-cyan-300">
            <Sparkles size={13} /> Fast Product Media Extraction
          </div>

          <h1 className="max-w-xl text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
            Download product media from e-commerce pages in seconds.
          </h1>

          <p className="mt-6 max-w-xl text-lg text-slate-300">
            Paste a product link from AliExpress, Temu, Shein, or Alibaba and collect gallery images, variant assets, description shots, and videos.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <div className="group flex w-full items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 shadow-xl shadow-slate-950/20 transition focus-within:border-cyan-400/60 focus-within:bg-slate-900">
              <Link2 size={18} className="text-slate-400" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste product URL here..."
                className="w-full bg-transparent text-base text-white outline-none placeholder:text-slate-500"
              />
            </div>

            <button
              onClick={handleExtract}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-3 font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
              {loading ? 'Processing...' : 'Download Media'}
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {sampleUrls.map((sample, index) => (
              <button
                key={sample + index}
                type="button"
                onClick={() => setUrl(sample.replace('...', '100500123456789'))}
                className="rounded-full border border-slate-700 bg-slate-900/40 px-3 py-1 text-xs text-slate-300 transition hover:border-cyan-400/50 hover:text-white"
              >
                {sample.split('/')[2].replace('www.', '')}
              </button>
            ))}
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-5 text-sm text-slate-300">
            <span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-cyan-300" /> Secure</span>
            <span className="inline-flex items-center gap-2"><Layers3 size={16} className="text-cyan-300" /> 4 media groups</span>
            <span className="inline-flex items-center gap-2"><PackageCheck size={16} className="text-cyan-300" /> ZIP export</span>
          </div>
        </div>

        <div className="relative">
          <div className="grid-pattern absolute inset-0 rounded-[2rem] opacity-30" />
          <div className="relative glass rounded-[2rem] p-5 shadow-glow">
            <div className="rounded-[1.5rem] border border-slate-700 bg-slate-950/80 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400" />
                  <span className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Producer</span>
              </div>

              <div className="rounded-[1.5rem] bg-gradient-to-br from-slate-800 to-slate-900 p-4">
                <div className="aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-gradient-to-br from-indigo-500 via-cyan-500 to-blue-600 p-5">
                  <div className="flex h-full items-center justify-center rounded-[1rem] border border-white/20 bg-white/5 backdrop-blur-md">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
                      <div className="ml-1 h-0 w-0 border-y-[12px] border-l-[18px] border-y-transparent border-l-white" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
                  <span className="text-sm text-slate-300">Platform</span>
                  <span className="text-sm font-medium text-cyan-300">{platform || 'AliExpress'}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
                  <span className="text-sm text-slate-300">Assets</span>
                  <span className="text-sm font-medium text-white">{items.length || '24 files'}</span>
                </div>
                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950">
                  Download Ready <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Why choose</p>
          <h2 className="mt-3 text-3xl font-bold md:text-5xl">Built for speed, organization, and clarity.</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {FEATURE_ITEMS.map((feature) => (
            <div key={feature.title} className="glass rounded-[1.75rem] p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300">
                <Check size={18} />
              </div>
              <h3 className="text-xl font-semibold">{feature.title}</h3>
              <p className="mt-3 text-slate-300">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="process" className="mx-auto max-w-7xl px-4 py-20 md:px-8">
        <div className="mb-12 text-center">
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Process</p>
          <h2 className="mt-3 text-3xl font-bold md:text-5xl">Three simple steps</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            ['1. Paste URL', 'Add the product page you want to inspect.'],
            ['2. Extract Assets', 'The app renders the storefront and collects media from the page.'],
            ['3. Download', 'Review the gallery, pick what you need, and save it in a ZIP.'],
          ].map(([step, text], index) => (
            <div key={step} className="glass rounded-[1.75rem] p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 font-bold text-slate-950">
                {index + 1}
              </div>
              <h3 className="text-xl font-semibold">{step}</h3>
              <p className="mt-3 text-slate-300">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="gallery" className="mx-auto max-w-7xl px-4 pb-24 pt-10 md:px-8">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">Media gallery</p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">{title || 'Product media result'}</h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleAllVisible}
              className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-200"
            >
              {visibleSelected.length === visibleItems.length && visibleItems.length > 0 ? 'Clear selection' : 'Select all'}
            </button>
            <button
              onClick={downloadSelectedZip}
              disabled={!totalSelected}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PackageCheck size={16} /> Download selected ZIP
            </button>
          </div>
        </div>

        {items.length ? (
          <>
            <div className="mb-8 flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-cyan-500 text-slate-950'
                      : 'border border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm text-slate-300">
              <span>
                {visibleItems.length} items in {TABS.find((tab) => tab.id === activeTab)?.label}
              </span>
              <span>{totalSelected} selected</span>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visibleItems.map((item) => (
                <div key={item.id} className="group relative overflow-hidden rounded-[1.5rem] border border-slate-800 bg-slate-900/60">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {item.type === 'video' ? (
                      <video
                        src={item.src}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        controls={false}
                      />
                    ) : (
                      <img src={item.src} alt={item.alt} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                    )}

                    <div className="image-overlay absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/0 to-slate-950/15 opacity-0 transition group-hover:opacity-100" />

                    <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
                      <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-cyan-300 shadow-lg backdrop-blur-sm">
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={Boolean(selectedMap[item.id])}
                          onChange={() => toggleSelection(item.id)}
                        />
                        {selectedMap[item.id] ? <Check size={15} /> : <span className="h-2.5 w-2.5 rounded-full bg-white/70" />}
                      </label>
                    </div>

                    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200">
                      {item.type === 'video' ? <Video size={12} /> : <ImageIcon size={12} />}
                      {item.type}
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium text-white">{item.label}</p>
                      <button
                        onClick={() => downloadSingle(item)}
                        className="inline-flex items-center gap-1 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-1.5 text-[11px] font-medium text-cyan-300"
                      >
                        <Download size={12} /> Download
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{item.category}</span>
                      <span className="inline-flex items-center gap-1">
                        {item.type === 'video' ? 'MP4' : 'JPEG'}
                        <ChevronRight size={12} />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="glass rounded-[1.75rem] p-10 text-center text-slate-300">
            <p>Paste a product URL and click “Download Media” to preview the extracted assets.</p>
          </div>
        )}
      </section>
    </main>
  );
}
