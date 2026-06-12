import { ImageResponse } from '@vercel/og';
import React from 'react';

export const config = { runtime: 'edge' };

// Planary design system — dark + violet accent
const BG = '#0a070e';
const BG_ELEV = '#100913';
const SURFACE = '#181024';
const SURFACE_2 = '#1f1430';
const BORDER = '#2d1b40';
const BORDER_SOFT = '#221635';

const ACCENT = '#7f0df2';
const ACCENT_LIGHT = '#9b3ff7';
const ACCENT_DARK = '#5a06b0';
const ACCENT_SOFT = 'rgba(127, 13, 242, 0.18)';

const TEXT_HI = '#f1f5f9';
const TEXT_MD = '#cbd5e1';
const TEXT_LO = '#94a3b8';
const TEXT_FAINT = '#475569';

const JAKARTA_URL =
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=swap';

async function loadGoogleFont(cssUrl, weight) {
  const css = await fetch(cssUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    },
  }).then((r) => r.text());
  // Find each weight block and pull its TTF/OTF URL.
  const blocks = css.split('@font-face').slice(1);
  for (const block of blocks) {
    if (!block.includes(`font-weight: ${weight}`)) continue;
    const m = block.match(/src:\s*url\((https:[^)]+)\)\s*format\('(opentype|truetype)'\)/);
    if (m) return fetch(m[1]).then((r) => r.arrayBuffer());
  }
  // Fallback: first available font URL.
  const m = css.match(/src:\s*url\((https:[^)]+)\)\s*format\('(opentype|truetype)'\)/);
  if (!m) throw new Error('font url not found');
  return fetch(m[1]).then((r) => r.arrayBuffer());
}

const h = React.createElement;

function BrandMark({ size = 36 }) {
  return h(
    'div',
    {
      style: {
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        background: ACCENT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'Jakarta',
        fontWeight: 800,
        fontSize: Math.round(size * 0.55),
        letterSpacing: -1,
        boxShadow: `0 0 0 1px ${ACCENT_DARK}, 0 0 28px ${ACCENT_SOFT}`,
      },
    },
    'P'
  );
}

function TaskRow({ width = 220, accent = false, done = false }) {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        marginBottom: 12,
      },
    },
    h('div', {
      style: {
        width: 20,
        height: 20,
        borderRadius: 6,
        border: `1.5px solid ${done ? ACCENT : BORDER}`,
        background: done ? ACCENT : 'transparent',
        display: 'flex',
      },
    }),
    h('div', {
      style: {
        width,
        height: 10,
        borderRadius: 999,
        background: accent
          ? `linear-gradient(90deg, ${ACCENT}, ${ACCENT_LIGHT})`
          : SURFACE_2,
      },
    }),
    accent && h('div', {
      style: {
        width: 4,
        height: 18,
        marginLeft: 'auto',
        borderRadius: 2,
        background: ACCENT,
      },
    })
  );
}

function HomeIllustration() {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: 380,
        height: 380,
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 24,
        boxShadow: `0 30px 60px -20px rgba(0,0,0,0.6), 0 10px 30px -10px ${ACCENT_SOFT}`,
        overflow: 'hidden',
      },
    },
    // mock chrome bar
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '14px 18px',
          borderBottom: `1px solid ${BORDER_SOFT}`,
        },
      },
      h('div', { style: { width: 8, height: 8, borderRadius: 999, background: '#3a2451' } }),
      h('div', { style: { width: 8, height: 8, borderRadius: 999, background: '#3a2451' } }),
      h('div', { style: { width: 8, height: 8, borderRadius: 999, background: '#3a2451' } }),
      h('div', { style: { flex: 1, display: 'flex' } }),
      h('div', {
        style: {
          padding: '3px 10px',
          fontSize: 9,
          fontFamily: 'Jakarta',
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: ACCENT_LIGHT,
          background: ACCENT_SOFT,
          borderRadius: 999,
          display: 'flex',
        },
      }, 'TODAY')
    ),
    // body
    h(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          padding: '22px 24px',
          background: BG_ELEV,
          flex: 1,
        },
      },
      TaskRow({ width: 230, accent: true, done: true }),
      TaskRow({ width: 190, accent: true, done: false }),
      TaskRow({ width: 260, accent: false, done: false }),
      TaskRow({ width: 160, accent: false, done: false }),
      TaskRow({ width: 210, accent: false, done: false })
    )
  );
}

function WikiIllustration({ cover }) {
  if (cover) {
    return h(
      'div',
      {
        style: {
          display: 'flex',
          width: 380,
          height: 380,
          borderRadius: 24,
          overflow: 'hidden',
          border: `1px solid ${BORDER}`,
          boxShadow: `0 30px 60px -20px rgba(0,0,0,0.7), 0 10px 30px -10px ${ACCENT_SOFT}`,
        },
      },
      h('img', {
        src: cover,
        width: 380,
        height: 380,
        style: { objectFit: 'cover' },
      })
    );
  }
  return HomeIllustration();
}

export default async function handler(req) {
  try {
    const url = new URL(req.url);
    const kind = url.searchParams.get('kind') || 'home';
    const title =
      url.searchParams.get('title') ||
      (kind === 'wiki' ? '위키 노트' : 'Planary');
    const description =
      url.searchParams.get('description') ||
      (kind === 'wiki'
        ? '생각을 차분히 정리하는 위키 한 페이지.'
        : '생각을 정리하는 워크스페이스');
    const cover = url.searchParams.get('cover');

    const [jakarta500, jakarta700, jakarta800] = await Promise.all([
      loadGoogleFont(JAKARTA_URL, 500),
      loadGoogleFont(JAKARTA_URL, 700),
      loadGoogleFont(JAKARTA_URL, 800),
    ]);

    return new ImageResponse(
      h(
        'div',
        {
          style: {
            width: '100%',
            height: '100%',
            display: 'flex',
            background: BG,
            fontFamily: 'Jakarta',
            color: TEXT_HI,
            padding: 72,
            position: 'relative',
          },
        },
        // radial glow background
        h('div', {
          style: {
            position: 'absolute',
            inset: 0,
            background:
              `radial-gradient(900px 500px at -10% -10%, ${ACCENT_SOFT}, transparent 60%),` +
              ` radial-gradient(700px 400px at 110% 110%, rgba(155,63,247,0.12), transparent 60%)`,
            display: 'flex',
          },
        }),
        // left content column
        h(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              flex: 1,
              zIndex: 1,
            },
          },
          // top label
          h(
            'div',
            { style: { display: 'flex', alignItems: 'center', gap: 14 } },
            BrandMark({ size: 36 }),
            h(
              'div',
              {
                style: {
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 1.6,
                  textTransform: 'uppercase',
                  color: TEXT_LO,
                  display: 'flex',
                },
              },
              kind === 'wiki' ? 'Planary · Wiki' : 'Planary'
            )
          ),
          // title + description
          h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', maxWidth: 640 } },
            h(
              'div',
              {
                style: {
                  fontSize: title.length > 28 ? 60 : 76,
                  lineHeight: 1.02,
                  fontWeight: 800,
                  color: TEXT_HI,
                  letterSpacing: -2,
                  marginBottom: 22,
                  display: 'flex',
                  background:
                    `linear-gradient(180deg, ${TEXT_HI} 0%, ${ACCENT_LIGHT} 200%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                },
              },
              title
            ),
            h(
              'div',
              {
                style: {
                  fontSize: 26,
                  lineHeight: 1.4,
                  color: TEXT_MD,
                  fontWeight: 500,
                  display: 'flex',
                },
              },
              description
            )
          ),
          // footer
          h(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                paddingTop: 22,
                borderTop: `1px solid ${BORDER}`,
              },
            },
            BrandMark({ size: 28 }),
            h(
              'div',
              {
                style: {
                  fontSize: 22,
                  color: TEXT_LO,
                  fontWeight: 600,
                  letterSpacing: -0.3,
                  display: 'flex',
                },
              },
              'yourplanary.vercel.app'
            )
          )
        ),
        // right illustration
        h(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 380,
              marginLeft: 56,
              zIndex: 1,
            },
          },
          kind === 'wiki' ? WikiIllustration({ cover }) : HomeIllustration()
        )
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          { name: 'Jakarta', data: jakarta500, style: 'normal', weight: 500 },
          { name: 'Jakarta', data: jakarta700, style: 'normal', weight: 700 },
          { name: 'Jakarta', data: jakarta800, style: 'normal', weight: 800 },
        ],
        headers: {
          'Cache-Control':
            'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch (err) {
    console.error('[og] image generation error:', err);
    return new Response('Failed to generate image', { status: 500 });
  }
}
