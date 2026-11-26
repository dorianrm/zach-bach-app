import { ImageResponse } from 'next/og';

export const alt = 'Zach Attack. The bachelor weekend, Dec 18-19.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// ImageResponse cannot read CSS variables. Hex values mirror the tokens in app/globals.css.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 24,
          padding: 96,
          background: '#2d4f9e', // --color-hero
          color: '#ffffff', // --color-hero-text
        }}
      >
        <div style={{ fontSize: 32, letterSpacing: 6, textTransform: 'uppercase', color: '#ffd84d' /* --color-highlight */ }}>
          The bachelor weekend
        </div>
        <div style={{ fontSize: 140, fontWeight: 700, lineHeight: 1, textTransform: 'uppercase' }}>Zach Attack</div>
        <div style={{ fontSize: 40, color: '#dbe5ff' /* --color-hero-muted */ }}>Dec 18-19 · Portland and Hillsboro</div>
      </div>
    ),
    size,
  );
}
