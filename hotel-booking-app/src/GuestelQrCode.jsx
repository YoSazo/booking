import React, { useEffect, useState } from 'react';

export default function GuestelQrCode({ value, size = 240, alt = 'Open in Guestel', style = {} }) {
  const [src, setSrc] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setSrc('');
    setFailed(false);
    if (!value) {
      setFailed(true);
      return () => { active = false; };
    }

    import('qrcode')
      .then((module) => (module.default || module).toDataURL(value, {
        width: size,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#0A0F0D', light: '#FFFFFF' },
      }))
      .then((dataUrl) => { if (active) setSrc(dataUrl); })
      .catch(() => { if (active) setFailed(true); });

    return () => { active = false; };
  }, [size, value]);

  if (failed) {
    return (
      <a href={value || '#'} style={{ ...styles.fallback, ...style }}>
        Open this property in Guestel
      </a>
    );
  }

  return (
    <div style={{ ...styles.frame, width: size, height: size, ...style }} aria-busy={!src}>
      {src
        ? <img src={src} alt={alt} width={size} height={size} style={styles.image} />
        : <div style={styles.loader} aria-label="Creating Guestel QR code" />}
    </div>
  );
}

const styles = {
  frame: {
    maxWidth: '100%',
    display: 'grid',
    placeItems: 'center',
    overflow: 'hidden',
    borderRadius: 14,
    background: '#fff',
  },
  image: { width: '100%', height: '100%', display: 'block' },
  loader: {
    width: 24,
    height: 24,
    border: '3px solid #d8e4dc',
    borderTopColor: '#2E7D5B',
    borderRadius: '50%',
    animation: 'spin .8s linear infinite',
  },
  fallback: {
    display: 'grid',
    minHeight: 120,
    placeItems: 'center',
    padding: 18,
    borderRadius: 14,
    background: '#E8F5EE',
    color: '#1a5c3f',
    fontSize: 14,
    fontWeight: 800,
    textAlign: 'center',
    textDecoration: 'none',
    boxSizing: 'border-box',
  },
};
