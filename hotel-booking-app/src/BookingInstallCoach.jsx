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

function AppleShareGlyph() {
  return (
    <span className="booking-install-share-glyph" aria-hidden>
      <svg viewBox="169 8.5 21 25.5" focusable="false" aria-hidden="true">
        <path d="M173.334 33.2705C172.21 33.2705 171.365 32.9912 170.799 32.4326C170.24 31.8812 169.961 31.0505 169.961 29.9404V19.3379C169.961 18.2279 170.24 17.3971 170.799 16.8457C171.365 16.2871 172.21 16.0078 173.334 16.0078H176.621V17.7373H173.355C172.818 17.7373 172.407 17.8805 172.12 18.167C171.834 18.4463 171.69 18.8652 171.69 19.4238V29.8545C171.69 30.4131 171.834 30.832 172.12 31.1113C172.407 31.3978 172.818 31.541 173.355 31.541H185.623C186.153 31.541 186.565 31.3978 186.858 31.1113C187.152 30.832 187.299 30.4131 187.299 29.8545V19.4238C187.299 18.8652 187.152 18.4463 186.858 18.167C186.565 17.8805 186.153 17.7373 185.623 17.7373H182.357V16.0078H185.655C186.78 16.0078 187.621 16.2871 188.18 16.8457C188.745 17.3971 189.028 18.2279 189.028 19.3379V29.9404C189.028 31.0505 188.745 31.8812 188.18 32.4326C187.621 32.9912 186.78 33.2705 185.655 33.2705H173.334ZM179.489 24.8486C179.26 24.8486 179.06 24.7663 178.888 24.6016C178.723 24.4368 178.641 24.2435 178.641 24.0215V13.0859L178.705 11.4854L178.104 12.1191L176.438 13.8916C176.288 14.0635 176.091 14.1494 175.848 14.1494C175.626 14.1494 175.439 14.0778 175.289 13.9346C175.146 13.7913 175.074 13.6123 175.074 13.3975C175.074 13.1898 175.16 13 175.332 12.8281L178.866 9.41211C178.981 9.30469 179.085 9.23307 179.178 9.19727C179.278 9.1543 179.382 9.13281 179.489 9.13281C179.604 9.13281 179.708 9.1543 179.801 9.19727C179.901 9.23307 180.005 9.30469 180.112 9.41211L183.657 12.8281C183.822 13 183.904 13.1898 183.904 13.3975C183.904 13.6123 183.829 13.7913 183.679 13.9346C183.528 14.0778 183.342 14.1494 183.12 14.1494C182.884 14.1494 182.69 14.0635 182.54 13.8916L180.886 12.1191L180.284 11.4854L180.349 13.0859V24.0215C180.349 24.2435 180.263 24.4368 180.091 24.6016C179.926 24.7663 179.726 24.8486 179.489 24.8486Z" />
      </svg>
    </span>
  );
}

function AppleMenuControl() {
  return (
    <span className="booking-install-menu-glyph" aria-hidden>
      <svg viewBox="45 41.5 19 6" focusable="false" aria-hidden="true">
        <path d="M47.2441 46.2949C46.2188 46.2949 45.3887 45.4746 45.3887 44.4492C45.3887 43.4238 46.2188 42.5938 47.2441 42.5938C48.2695 42.5938 49.0898 43.4238 49.0898 44.4492C49.0898 45.4746 48.2695 46.2949 47.2441 46.2949ZM54.5 46.2949C53.4746 46.2949 52.6445 45.4746 52.6445 44.4492C52.6445 43.4238 53.4746 42.5938 54.5 42.5938C55.5254 42.5938 56.3457 43.4238 56.3457 44.4492C56.3457 45.4746 55.5254 46.2949 54.5 46.2949ZM61.7559 46.2949C60.7305 46.2949 59.9004 45.4746 59.9004 44.4492C59.9004 43.4238 60.7305 42.5938 61.7559 42.5938C62.7812 42.5938 63.6113 43.4238 63.6113 44.4492C63.6113 45.4746 62.7812 46.2949 61.7559 46.2949Z" />
      </svg>
    </span>
  );
}

function AppleViewMoreGlyph() {
  return (
    <span className="booking-install-view-more-glyph" aria-hidden>
      <svg viewBox="44 39.5 21 13" focusable="false" aria-hidden="true">
        <path d="M54.3197 51.13C54.1836 51.1313 54.0545 51.1039 53.9322 51.0478C53.8171 50.9988 53.709 50.9246 53.6077 50.8253L45.201 42.3981C45.0058 42.2066 44.9068 41.9712 44.9042 41.6919C44.9024 41.5129 44.9438 41.3477 45.0283 41.1965C45.1128 41.0453 45.2298 40.926 45.3794 40.8386C45.5218 40.7513 45.686 40.7068 45.8722 40.705C46.1372 40.7024 46.3708 40.7933 46.5731 40.9775L54.2965 48.7238L61.8693 40.8302C62.068 40.6421 62.2999 40.5468 62.5648 40.5442C62.751 40.5424 62.9161 40.5838 63.0602 40.6684C63.2114 40.7529 63.3307 40.8699 63.4181 41.0194C63.5055 41.169 63.55 41.3333 63.5517 41.5123C63.5544 41.7916 63.4636 42.0288 63.2793 42.224L55.0256 50.8116C54.9264 50.9129 54.8161 50.9891 54.6948 51.0404C54.5808 51.0988 54.4558 51.1287 54.3197 51.13Z" />
      </svg>
    </span>
  );
}

function AppleAddToHomeGlyph() {
  return (
    <span className="booking-install-add-home-glyph" aria-hidden>
      <svg viewBox="0 0 28 28" focusable="false" aria-hidden="true">
        <path d="M6.32 2.25h15.36c2.77 0 4.07 1.3 4.07 4.07v15.36c0 2.77-1.3 4.07-4.07 4.07H6.32c-2.77 0-4.07-1.3-4.07-4.07V6.32c0-2.77 1.3-4.07 4.07-4.07Zm.08 2C4.91 4.25 4.25 4.91 4.25 6.4v15.2c0 1.49.66 2.15 2.15 2.15h15.2c1.49 0 2.15-.66 2.15-2.15V6.4c0-1.49-.66-2.15-2.15-2.15H6.4Z" />
        <path d="M13.99 20.02c-.61 0-1.01-.41-1.01-1.03v-3.98H9c-.62 0-1.03-.4-1.03-1.01 0-.62.41-1.02 1.03-1.02h3.98V9c0-.62.4-1.03 1.01-1.03.62 0 1.02.41 1.02 1.03v3.98H19c.62 0 1.03.4 1.03 1.02 0 .61-.41 1.01-1.03 1.01h-3.99v3.98c0 .62-.4 1.03-1.02 1.03Z" />
      </svg>
    </span>
  );
}

function InstallVisualSequence({ compact, modernIos }) {
  const steps = [
    ...(compact ? [{ label: 'More', icon: <AppleMenuControl /> }] : []),
    { label: 'Share', icon: <AppleShareGlyph /> },
    ...(modernIos ? [{ label: 'View More', icon: <AppleViewMoreGlyph /> }] : []),
    { label: 'Add to Home Screen', icon: <AppleAddToHomeGlyph /> },
  ];

  return (
    <div className="booking-install-visual-sequence" aria-label={steps.map((step) => step.label).join(', then ')}>
      {steps.map((step, index) => (
        <React.Fragment key={step.label}>
          {index > 0 && <span className="booking-install-sequence-arrow" aria-hidden>→</span>}
          <span className="booking-install-sequence-step">
            <span className="booking-install-sequence-icon" aria-hidden>{step.icon}</span>
            <span>{step.label}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
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

  return (
    <div className={`booking-install-panel ${previewNav ? 'booking-install-panel--preview' : ''}`}>
      <SheetHeader onBack={modernIos ? onBack : undefined} onClose={onClose} />
      {previewNav}
      <div className="booking-install-single-action">
        <h2>{title}</h2>
        <InstallVisualSequence compact={compact} modernIos={modernIos} />
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
