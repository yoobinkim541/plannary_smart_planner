import { ImageResponse } from '@vercel/og';
import React from 'react';

export const config = { runtime: 'edge' };

const BG = '#F4F1EA';
const BG_SOFT = '#EBE5D6';
const INK = '#2D2A26';
const INK_SOFT = '#6B6760';
const CLAY = '#CC785C';
const CLAY_SOFT = '#D4A27F';
const HAIRLINE = 'rgba(45, 42, 38, 0.14)';

const SERIF_URL =
  'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&display=swap';
const INTER_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';

async function loadGoogleFont(cssUrl) {
  const css = await fetch(cssUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
    },
  }).then((r) => r.text());
  const match = css.match(/src:\s*url\((https:[^)]+)\)\s*format\('(opentype|truetype)'\)/);
  if (!match) throw new Error('font url not found');
  const buf = await fetch(match[1]).then((r) => r.arrayBuffer());
  return buf;
}

const h = React.createElement;

function Sparkle({ size = 28, color = CLAY }) {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24' },
    h('path', {
      d: 'M12 1 L13.6 9.2 L22 12 L13.6 14.8 L12 23 L10.4 14.8 L2 12 L10.4 9.2 Z',
      fill: color,
    })
  );
}

function ChromeBar() {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '14px 18px',
        borderBottom: `1px solid ${HAIRLINE}`,
      },
    },
    h('div', { style: { width: 10, height: 10, borderRadius: 999, background: '#E6B3A6' } }),
    h('div', { style: { width: 10, height: 10, borderRadius: 999, background: '#E8D5A6' } }),
    h('div', { style: { width: 10, height: 10, borderRadius: 999, background: '#C9C2B0' } })
  );
}

function HomeIllustration() {
  const row = (w, accent) =>
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 } },
      h('div', {
        style: {
          width: 18,
          height: 18,
          borderRadius: 6,
          border: `1.5px solid ${accent ? CLAY : INK_SOFT}`,
          background: accent ? CLAY : 'transparent',
        },
      }),
      h('div', {
        style: { width: w, height: 10, borderRadius: 999, background: BG_SOFT },
      })
    );
  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: 360,
        height: 360,
        background: '#FBF8F1',
        border: `1px solid ${HAIRLINE}`,
        borderRadius: 24,
        boxShadow: '0 30px 60px -30px rgba(45,42,38,0.25)',
        overflow: 'hidden',
      },
    },
    ChromeBar(),
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', padding: '22px 24px' } },
      row(220, true),
      row(180, true),
      row(240, false),
      row(150, false),
      row(200, false)
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
          width: 360,
          height: 360,
          borderRadius: 24,
          overflow: 'hidden',
          border: `1px solid ${HAIRLINE}`,
          boxShadow: '0 30px 60px -30px rgba(45,42,38,0.25)',
        },
      },
      h('img', {
        src: cover,
        width: 360,
        height: 360,
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

    const [serif, inter] = await Promise.all([
      loadGoogleFont(SERIF_URL),
      loadGoogleFont(INTER_URL),
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
            fontFamily: 'Inter',
            color: INK,
            padding: 72,
            position: 'relative',
          },
        },
        // subtle background grain via radial gradients
        h('div', {
          style: {
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(1200px 600px at -10% 110%, rgba(204,120,92,0.10), transparent 60%), radial-gradient(800px 500px at 110% -10%, rgba(212,162,127,0.18), transparent 60%)',
            display: 'flex',
          },
        }),
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
            { style: { display: 'flex', alignItems: 'center', gap: 12 } },
            Sparkle({ size: 22 }),
            h(
              'div',
              {
                style: {
                  fontSize: 22,
                  fontWeight: 500,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  color: INK_SOFT,
                },
              },
              kind === 'wiki' ? 'Planary · Wiki' : 'Planary'
            )
          ),
          // title + description
          h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', maxWidth: 620 } },
            h(
              'div',
              {
                style: {
                  fontFamily: 'SourceSerif',
                  fontSize: title.length > 28 ? 60 : 72,
                  lineHeight: 1.05,
                  fontWeight: 600,
                  color: INK,
                  letterSpacing: -1,
                  marginBottom: 22,
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
                  color: INK_SOFT,
                  fontWeight: 400,
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
                paddingTop: 24,
                borderTop: `1px solid ${HAIRLINE}`,
              },
            },
            h('div', {
              style: {
                width: 28,
                height: 28,
                borderRadius: 8,
                background: CLAY,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: BG,
                fontFamily: 'SourceSerif',
                fontWeight: 600,
                fontSize: 18,
              },
            }, 'P'),
            h(
              'div',
              { style: { fontSize: 22, color: INK_SOFT, fontWeight: 500 } },
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
              width: 360,
              marginLeft: 48,
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
          { name: 'SourceSerif', data: serif, style: 'normal', weight: 600 },
          { name: 'Inter', data: inter, style: 'normal', weight: 400 },
        ],
        headers: {
          'Cache-Control':
            'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch (err) {
    return new Response(`og image error: ${err.message}`, { status: 500 });
  }
}
