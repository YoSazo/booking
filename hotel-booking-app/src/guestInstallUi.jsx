import React from 'react';
import { MessageCircle, Bell, Building2, CheckCircle2, Share, SquarePlus } from 'lucide-react';

export const BRAND = '#2E7D5B';
export const IOS_SHARE_BLUE = '#007aff';

export const INSTALL_THEME = {
  green: '#2E7D5B',
  greenLight: '#4CAF7D',
  greenPale: '#E8F5EE',
  bg: '#EEF2EF',
  white: '#FFFFFF',
  text: '#1A2B22',
  textMuted: '#6B7D72',
  border: '#D8E4DC',
  shadow: '0 2px 12px rgba(46,125,91,0.10)',
};

const stepBadgeStyle = {
  width: 26,
  height: 26,
  borderRadius: '50%',
  background: '#f0fdf4',
  color: BRAND,
  fontWeight: 800,
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const stepTextStyle = {
  fontSize: 14,
  color: '#374151',
  lineHeight: 1.4,
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 4,
};

export function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isAndroid() {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
}

export function qrCodeUrl(data, size = 200) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export function HotelIcon({ hotelName, appIconUrl, size = 68, style = {} }) {
  const initial = (hotelName || 'H').trim().charAt(0).toUpperCase();
  const radius = Math.round(size * 0.25);
  const base = {
    width: size,
    height: size,
    borderRadius: radius,
    flexShrink: 0,
    boxShadow: size >= 60 ? '0 8px 18px rgba(46,125,91,0.28)' : undefined,
    ...style,
  };
  if (appIconUrl) {
    return (
      <img
        src={appIconUrl}
        alt=""
        style={{ ...base, objectFit: 'cover' }}
      />
    );
  }
  return (
    <div style={{
      ...base,
      background: BRAND,
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.46,
      fontWeight: 800,
    }}>
      {initial}
    </div>
  );
}

export function SuccessCheckIcon({ size = 62 }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      margin: '0 auto 16px',
      background: BRAND,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 8px 20px rgba(46,125,91,0.3)',
      animation: 'installPopIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      <CheckCircle2 size={Math.round(size * 0.45)} color="#fff" strokeWidth={2.5} />
    </div>
  );
}

export function InstallBenefits() {
  const items = [
    { Icon: MessageCircle, text: 'Message the front desk anytime' },
    { Icon: Bell, text: 'Get instant replies & stay updates' },
    { Icon: Building2, text: 'Book direct next time — skip the middleman' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28, textAlign: 'left' }}>
      {items.map(({ Icon, text }) => (
        <div
          key={text}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: INSTALL_THEME.bg,
            border: `1px solid ${INSTALL_THEME.border}`,
            borderRadius: 14,
            padding: '11px 13px',
          }}
        >
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            flexShrink: 0,
            background: INSTALL_THEME.greenPale,
            color: BRAND,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon size={18} strokeWidth={2.2} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: INSTALL_THEME.text, lineHeight: 1.4 }}>
            {text}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Matches Front Desk showIosInstallSheet() step copy + lucide share / square-plus icons. */
export function IosInstallSteps() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={stepBadgeStyle}>1</span>
        <div style={stepTextStyle}>
          Tap the <strong>Share</strong> button
          <Share size={18} color={IOS_SHARE_BLUE} strokeWidth={2} aria-hidden />
          in Safari&apos;s bar
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={stepBadgeStyle}>2</span>
        <div style={stepTextStyle}>
          Scroll down and tap <strong>Add to Home Screen</strong>
          <SquarePlus size={18} color={BRAND} strokeWidth={2} aria-hidden />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={stepBadgeStyle}>3</span>
        <div style={{ ...stepTextStyle, display: 'block' }}>
          Tap <strong>Add</strong> — done! It&apos;s on your home screen.
        </div>
      </div>
    </div>
  );
}

export function IosInstallSheet({
  hotelName,
  appIconUrl,
  onClose,
  onConfirmInstalled,
  title,
  subtitle = 'Add it to your home screen — takes 3 seconds.',
  openUrl,
}) {
  const sheetTitle = title || `Install ${hotelName || 'our app'}`;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          width: '100%',
          maxWidth: 440,
          borderRadius: '20px 20px 0 0',
          padding: '24px 22px 32px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <HotelIcon hotelName={hotelName} appIconUrl={appIconUrl} size={48} style={{ margin: 0, boxShadow: 'none' }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e' }}>
              {sheetTitle}
            </div>
            {subtitle ? (
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>

        {openUrl ? (
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              textAlign: 'center',
              textDecoration: 'none',
              width: '100%',
              marginBottom: 16,
              padding: 12,
              borderRadius: 11,
              border: `1.5px solid ${BRAND}`,
              background: 'none',
              color: BRAND,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Open booking page →
          </a>
        ) : null}

        <IosInstallSteps />

        {onConfirmInstalled ? (
          <button
            type="button"
            onClick={() => { onConfirmInstalled(); onClose(); }}
            style={{
              width: '100%',
              marginTop: 22,
              padding: 14,
              borderRadius: 12,
              border: 'none',
              background: BRAND,
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            I&apos;ve added it to my home screen
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              marginTop: 22,
              padding: 14,
              borderRadius: 12,
              border: 'none',
              background: BRAND,
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Got it
          </button>
        )}

        {onConfirmInstalled ? (
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              marginTop: 10,
              padding: 14,
              borderRadius: 12,
              border: `1.5px solid ${INSTALL_THEME.border}`,
              background: 'none',
              color: INSTALL_THEME.textMuted,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Not yet
          </button>
        ) : null}
      </div>
    </div>
  );
}


