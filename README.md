# Media Extractor Pro

A full-stack web app for extracting media assets from e-commerce product URLs with a modern, conversion-focused interface inspired by downloader SaaS landing pages.

## Features

- Modern landing page and URL parsing UI
- Support for AliExpress, Temu, Shein, and Alibaba URL inputs
- Server-side extraction using Playwright
- Structured media gallery: Main, Variants, Description, and Videos
- Individual download or ZIP-based bulk download
- Responsive design with Tailwind CSS

## Tech Stack

- Next.js App Router
- Tailwind CSS
- Playwright
- JSZip
- Lucide icons

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## Notes

This app is intended for legally permitted media extraction from product pages you own or are authorized to access. The extraction layer attempts to fetch and inspect page media while handling common JS-heavy storefront layouts.
