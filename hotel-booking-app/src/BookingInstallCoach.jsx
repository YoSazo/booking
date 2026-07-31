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
      <svg viewBox="169 8.5 21 25.5" focusable="false" aria-hidden="true">
        <path d="M173.334 33.2705C172.21 33.2705 171.365 32.9912 170.799 32.4326C170.24 31.8812 169.961 31.0505 169.961 29.9404V19.3379C169.961 18.2279 170.24 17.3971 170.799 16.8457C171.365 16.2871 172.21 16.0078 173.334 16.0078H176.621V17.7373H173.355C172.818 17.7373 172.407 17.8805 172.12 18.167C171.834 18.4463 171.69 18.8652 171.69 19.4238V29.8545C171.69 30.4131 171.834 30.832 172.12 31.1113C172.407 31.3978 172.818 31.541 173.355 31.541H185.623C186.153 31.541 186.565 31.3978 186.858 31.1113C187.152 30.832 187.299 30.4131 187.299 29.8545V19.4238C187.299 18.8652 187.152 18.4463 186.858 18.167C186.565 17.8805 186.153 17.7373 185.623 17.7373H182.357V16.0078H185.655C186.78 16.0078 187.621 16.2871 188.18 16.8457C188.745 17.3971 189.028 18.2279 189.028 19.3379V29.9404C189.028 31.0505 188.745 31.8812 188.18 32.4326C187.621 32.9912 186.78 33.2705 185.655 33.2705H173.334ZM179.489 24.8486C179.26 24.8486 179.06 24.7663 178.888 24.6016C178.723 24.4368 178.641 24.2435 178.641 24.0215V13.0859L178.705 11.4854L178.104 12.1191L176.438 13.8916C176.288 14.0635 176.091 14.1494 175.848 14.1494C175.626 14.1494 175.439 14.0778 175.289 13.9346C175.146 13.7913 175.074 13.6123 175.074 13.3975C175.074 13.1898 175.16 13 175.332 12.8281L178.866 9.41211C178.981 9.30469 179.085 9.23307 179.178 9.19727C179.278 9.1543 179.382 9.13281 179.489 9.13281C179.604 9.13281 179.708 9.1543 179.801 9.19727C179.901 9.23307 180.005 9.30469 180.112 9.41211L183.657 12.8281C183.822 13 183.904 13.1898 183.904 13.3975C183.904 13.6123 183.829 13.7913 183.679 13.9346C183.528 14.0778 183.342 14.1494 183.12 14.1494C182.884 14.1494 182.69 14.0635 182.54 13.8916L180.886 12.1191L180.284 11.4854L180.349 13.0859V24.0215C180.349 24.2435 180.263 24.4368 180.091 24.6016C179.926 24.7663 179.726 24.8486 179.489 24.8486Z" />
      </svg>
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

function InstallPreviewNav({ modernIos, onChange }) {
  return (
    <div className="booking-install-preview-nav" aria-label="Installation guide preview">
      <button
        type="button"
        className={!modernIos ? 'is-active' : ''}
        aria-pressed={!modernIos}
        onClick={() => onChange(false)}
      >
        Classic
      </button>
      <button
        type="button"
        className={modernIos ? 'is-active' : ''}
        aria-pressed={modernIos}
        onClick={() => onChange(true)}
      >
        iOS 26
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

function LayoutChoice({ onSelect, onClose, previewNav }) {
  return (
    <div className={`booking-install-panel ${previewNav ? 'booking-install-panel--preview' : ''}`}>
      <SheetHeader onClose={onClose} />
      {previewNav}
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

function GuidedCue({ layout, modernIos, onBack, onClose, previewNav }) {
  const compact = layout === 'compact';
  const title = compact ? 'Tap the three dots, then Share' : 'Tap Share in Safari';
  const next = modernIos
    ? 'Then tap View More, then Add to Home Screen.'
    : 'Then tap Add to Home Screen.';

  return (
    <div className={`booking-install-panel ${previewNav ? 'booking-install-panel--preview' : ''}`}>
      <SheetHeader onBack={modernIos ? onBack : undefined} onClose={onClose} />
      {previewNav}
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
  const detectedModernIos = useMemo(() => isIos26Plus(), []);
  const safari = useMemo(() => isIosSafari(), []);
  const previewSetting = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('install-preview') || '';
  }, []);
  const showPreviewNav = import.meta.env.DEV || ['1', 'classic', 'ios26'].includes(previewSetting);
  const [modernIos, setModernIos] = useState(
    previewSetting === 'ios26' ? true : previewSetting === 'classic' ? false : detectedModernIos
  );
  const [layout, setLayout] = useState(modernIos ? null : 'standard');

  const changePreviewVersion = (nextModernIos) => {
    setModernIos(nextModernIos);
    setLayout(nextModernIos ? null : 'standard');
  };

  const previewNav = showPreviewNav ? (
    <InstallPreviewNav modernIos={modernIos} onChange={changePreviewVersion} />
  ) : null;

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
        <LayoutChoice onSelect={setLayout} onClose={onClose} previewNav={previewNav} />
      ) : (
        <GuidedCue
          layout={layout}
          modernIos={modernIos}
          onBack={() => setLayout(null)}
          onClose={onClose}
          previewNav={previewNav}
        />
      )}
    </div>
  );
}
