import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Ellipsis,
  ExternalLink,
  PanelTop,
  RotateCw,
  Share,
  SquarePlus,
  X,
} from 'lucide-react';
import { HotelIcon, IOS_SHARE_BLUE, isIos26Plus } from './guestInstallUi.jsx';
import './BookingInstallCoach.css';

const isIosSafari = () => {
  if (typeof navigator === 'undefined') return true;
  const ua = navigator.userAgent || '';
  const knownOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|YaBrowser|FBAN|FBAV|Instagram/i;
  return /Safari/i.test(ua) && !knownOtherBrowser.test(ua);
};

function SafariGlass({ children, className = '', target = false }) {
  return (
    <div className={`booking-install-glass ${className} ${target ? 'booking-install-target' : ''}`.trim()}>
      {children}
    </div>
  );
}

function StandardSafariBar({ compact = false, target = true }) {
  return (
    <div className={`booking-install-standard-bar ${compact ? 'booking-install-standard-bar--small' : ''}`}>
      <SafariGlass className="booking-install-standard-pill">
        <ChevronLeft aria-hidden />
        <ChevronRight className="booking-install-muted-icon" aria-hidden />
        <span className={target ? 'booking-install-icon-target' : ''}>
          <Share aria-hidden />
        </span>
        <BookOpen aria-hidden />
        <Copy aria-hidden />
      </SafariGlass>
    </div>
  );
}

function CompactSafariBar({ small = false, target = true }) {
  return (
    <div className={`booking-install-compact-bar ${small ? 'booking-install-compact-bar--small' : ''}`}>
      <SafariGlass className="booking-install-circle">
        <ChevronLeft aria-hidden />
      </SafariGlass>
      <SafariGlass className="booking-install-address-pill">
        <PanelTop aria-hidden />
        <span aria-hidden />
        <RotateCw aria-hidden />
      </SafariGlass>
      <SafariGlass className={`booking-install-circle ${target ? 'booking-install-icon-target' : ''}`}>
        <Ellipsis aria-hidden />
      </SafariGlass>
    </div>
  );
}

function NextAction({ icon, title, note }) {
  return (
    <div className="booking-install-next-action">
      <span className="booking-install-action-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        {note ? <small>{note}</small> : null}
      </span>
    </div>
  );
}

function BrowserHandoff({ hotelName, appIconUrl, onClose }) {
  const [copied, setCopied] = useState(false);

  const copyCurrentUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="booking-install-panel booking-install-panel--handoff">
      <button className="booking-install-close" type="button" onClick={onClose} aria-label="Close install guide">
        <X aria-hidden />
      </button>
      <HotelIcon hotelName={hotelName} appIconUrl={appIconUrl} size={62} />
      <span className="booking-install-eyebrow">One quick step first</span>
      <h2>Open this page in Safari</h2>
      <p>
        Safari gives you the reliable Home Screen install path. Use this browser&apos;s menu and choose
        <strong> Open in Safari</strong>, then tap Install again.
      </p>
      <div className="booking-install-handoff-route" aria-label="Open in Safari instructions">
        <span><Ellipsis aria-hidden /> Browser menu</span>
        <ChevronRight aria-hidden />
        <span><ExternalLink aria-hidden /> Open in Safari</span>
      </div>
      <button className="booking-install-secondary-button" type="button" onClick={copyCurrentUrl}>
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copied ? 'Link copied' : 'Copy this page link'}
      </button>
      <small className="booking-install-help">No App Store. Safari adds the property straight to your Home Screen.</small>
    </div>
  );
}

function LayoutChoice({ hotelName, appIconUrl, onSelect, onClose }) {
  return (
    <div className="booking-install-panel">
      <button className="booking-install-close" type="button" onClick={onClose} aria-label="Close install guide">
        <X aria-hidden />
      </button>
      <div className="booking-install-heading">
        <HotelIcon hotelName={hotelName} appIconUrl={appIconUrl} size={54} />
        <div>
          <span className="booking-install-eyebrow">Install in about 10 seconds</span>
          <h2>Match the Safari bar on your phone</h2>
        </div>
      </div>
      <p className="booking-install-intro">Choose the one that looks like the bottom of your screen.</p>
      <div className="booking-install-layout-choices">
        <button type="button" onClick={() => onSelect('standard')}>
          <span className="booking-install-choice-copy">
            <strong>I see the Share button</strong>
            <small>It is already in Safari&apos;s bar</small>
          </span>
          <StandardSafariBar compact />
          <span className="booking-install-choice-cta">Use these steps <ChevronRight aria-hidden /></span>
        </button>
        <button type="button" onClick={() => onSelect('compact')}>
          <span className="booking-install-choice-copy">
            <strong>I see three dots</strong>
            <small>Share is inside that menu</small>
          </span>
          <CompactSafariBar small />
          <span className="booking-install-choice-cta">Use these steps <ChevronRight aria-hidden /></span>
        </button>
      </div>
    </div>
  );
}

function GuidedSteps({ hotelName, appIconUrl, layout, modernIos, onBack, onClose }) {
  const compact = layout === 'compact';

  return (
    <div className="booking-install-panel booking-install-panel--steps">
      <div className="booking-install-top-actions">
        {modernIos ? (
          <button type="button" onClick={onBack} aria-label="Choose a different Safari layout">
            <ArrowLeft aria-hidden /> Back
          </button>
        ) : <span />}
        <button type="button" onClick={onClose} aria-label="Close install guide">
          <X aria-hidden />
        </button>
      </div>

      <div className="booking-install-step-title">
        <HotelIcon hotelName={hotelName} appIconUrl={appIconUrl} size={50} />
        <div>
          <span className="booking-install-eyebrow">Step 1</span>
          <h2>{compact ? 'Tap the three dots, then Share' : 'Tap Share in Safari'}</h2>
        </div>
      </div>

      <div className="booking-install-toolbar-demo" aria-label="Example of the Safari control to tap">
        <span className="booking-install-example-label">This is what to look for</span>
        {compact ? <CompactSafariBar /> : <StandardSafariBar />}
        {compact ? (
          <div className="booking-install-share-menu-example">
            <Share color={IOS_SHARE_BLUE} aria-hidden />
            <span><strong>Share</strong><small>Tap this in the menu</small></span>
          </div>
        ) : null}
      </div>

      <div className="booking-install-then">
        <span className="booking-install-eyebrow">Then finish with these taps</span>
        <div className="booking-install-action-list">
          {modernIos ? (
            <NextAction
              icon={<ChevronDown aria-hidden />}
              title="View More"
              note="This reveals the full list"
            />
          ) : null}
          <NextAction
            icon={<SquarePlus aria-hidden />}
            title="Add to Home Screen"
            note={modernIos ? null : 'Scroll down if you do not see it yet'}
          />
          <NextAction icon={<Check aria-hidden />} title="Add" note="Your property app is ready" />
        </div>
      </div>

      <div className="booking-install-real-toolbar">
        <ChevronDown aria-hidden />
        <strong>Now use Safari&apos;s real toolbar {compact ? 'at the bottom of your screen' : 'on your screen'}.</strong>
      </div>
      <small className="booking-install-help">
        You are not downloading another app. This puts {hotelName || 'this property'} directly on your Home Screen.
      </small>
    </div>
  );
}

export default function BookingInstallCoach({ hotelName, appIconUrl, onClose }) {
  const modernIos = useMemo(() => isIos26Plus(), []);
  const safari = useMemo(() => isIosSafari(), []);
  const [layout, setLayout] = useState(modernIos ? null : 'standard');

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="booking-install-overlay" role="dialog" aria-modal="true" aria-label={`Install ${hotelName || 'property app'}`}>
      <button className="booking-install-backdrop" type="button" onClick={onClose} aria-label="Close install guide" />
      {!safari ? (
        <BrowserHandoff hotelName={hotelName} appIconUrl={appIconUrl} onClose={onClose} />
      ) : modernIos && !layout ? (
        <LayoutChoice
          hotelName={hotelName}
          appIconUrl={appIconUrl}
          onSelect={setLayout}
          onClose={onClose}
        />
      ) : (
        <GuidedSteps
          hotelName={hotelName}
          appIconUrl={appIconUrl}
          layout={layout}
          modernIos={modernIos}
          onBack={() => setLayout(null)}
          onClose={onClose}
        />
      )}
    </div>
  );
}
