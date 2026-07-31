import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  Ellipsis,
  ExternalLink,
  X,
} from 'lucide-react';
import { isIos26Plus } from './guestInstallUi.jsx';
import standardActions from './assets/install-coach/safari-standard-actions.svg';
import './BookingInstallCoach.css';

const isIosSafari = () => {
  if (typeof navigator === 'undefined') return true;
  const ua = navigator.userAgent || '';
  const knownOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|YaBrowser|FBAN|FBAV|Instagram/i;
  return /Safari/i.test(ua) && !knownOtherBrowser.test(ua);
};

function AppleShareGlyph({ large = false }) {
  return (
    <span className={`booking-install-share-glyph ${large ? 'booking-install-share-glyph--large' : ''}`} aria-hidden>
      <img src={standardActions} alt="" />
    </span>
  );
}

function AppleMenuControl({ large = false }) {
  return (
    <span className={`booking-install-menu-glyph ${large ? 'booking-install-menu-glyph--large' : ''}`} aria-hidden>
      <i /><i /><i />
    </span>
  );
}

function SheetHeader({ onBack, onClose }) {
  return (
    <div className="booking-install-sheet-header">
      {onBack ? (
        <button type="button" onClick={onBack}>
          <ArrowLeft aria-hidden />
          Back
        </button>
      ) : <span />}
      <button type="button" onClick={onClose} aria-label="Close">
        <X aria-hidden />
      </button>
    </div>
  );
}

function BrowserHandoff({ onClose }) {
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
    <div className="booking-install-panel">
      <SheetHeader onClose={onClose} />
      <div className="booking-install-single-action">
        <span className="booking-install-plain-symbol"><ExternalLink aria-hidden /></span>
        <h2>Open in Safari</h2>
        <p>Choose <strong>Open in Safari</strong> from this browser&apos;s menu, then tap Install again.</p>
        <button className="booking-install-copy-link" type="button" onClick={copyCurrentUrl}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? 'Copied' : 'Copy link instead'}
        </button>
      </div>
    </div>
  );
}

function LayoutChoice({ onSelect, onClose }) {
  return (
    <div className="booking-install-panel">
      <SheetHeader onClose={onClose} />
      <div className="booking-install-choice-heading">
        <h2>What do you see in Safari?</h2>
        <p>Choose the button in your toolbar.</p>
      </div>
      <div className="booking-install-choice-list">
        <button type="button" onClick={() => onSelect('standard')}>
          <span className="booking-install-choice-icon"><AppleShareGlyph /></span>
          <span>Share button</span>
          <ChevronRight aria-hidden />
        </button>
        <button type="button" onClick={() => onSelect('compact')}>
          <span className="booking-install-choice-icon"><AppleMenuControl /></span>
          <span>Three dots</span>
          <ChevronRight aria-hidden />
        </button>
      </div>
    </div>
  );
}

function GuidedCue({ layout, modernIos, onBack, onClose }) {
  const compact = layout === 'compact';
  const title = compact ? 'Tap the three dots, then Share' : 'Tap Share in Safari';
  const next = modernIos
    ? 'Then tap View More, then Add to Home Screen.'
    : 'Then tap Add to Home Screen.';

  return (
    <div className="booking-install-panel">
      <SheetHeader onBack={modernIos ? onBack : undefined} onClose={onClose} />
      <div className="booking-install-single-action">
        <div className="booking-install-cue-symbol">
          {compact ? <AppleMenuControl large /> : <AppleShareGlyph large />}
        </div>
        <h2>{title}</h2>
        <p>{next}</p>
        <small>No App Store download required.</small>
      </div>
    </div>
  );
}

export default function BookingInstallCoach({ onClose }) {
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
    <div className="booking-install-overlay" role="dialog" aria-modal="true" aria-label="Add to Home Screen">
      <button className="booking-install-backdrop" type="button" onClick={onClose} aria-label="Close" />
      {!safari ? (
        <BrowserHandoff onClose={onClose} />
      ) : modernIos && !layout ? (
        <LayoutChoice onSelect={setLayout} onClose={onClose} />
      ) : (
        <GuidedCue
          layout={layout}
          modernIos={modernIos}
          onBack={() => setLayout(null)}
          onClose={onClose}
        />
      )}
    </div>
  );
}
