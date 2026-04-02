import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'DistSim — Learn Distributed Systems by Building Them';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 900,
              color: '#000',
            }}
          >
            D
          </div>
          <span style={{ fontSize: 36, fontWeight: 700, color: '#fafafa', letterSpacing: '-0.02em' }}>
            DistSim
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: '#fafafa',
            textAlign: 'center',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            maxWidth: 800,
          }}
        >
          Build. Break. Learn.
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 22,
            color: '#a1a1a1',
            marginTop: 20,
            textAlign: 'center',
            maxWidth: 600,
          }}
        >
          Simulate real distributed infrastructure — no VPS needed, no cloud bills.
        </div>

        {/* Bottom accent */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: '#22c55e',
          }}
        />
      </div>
    ),
    { ...size }
  );
}
