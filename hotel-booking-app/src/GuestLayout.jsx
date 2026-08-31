import React from 'react';

// The browser is the booking surface. Guestel owns the installed guest-app
// experience, navigation, badges, messages, and push notifications.
export default function GuestLayout({ children }) {
  return (
    <div style={styles.wrapper}>
      <div style={styles.content}>{children}</div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: '100%',
    minHeight: '100dvh',
    background: '#EFF4F0',
    '--guest-nav-clearance': '0px',
    '--guest-top-tabs-height': '0px',
  },
  content: {
    width: '100%',
    minHeight: '100dvh',
    boxSizing: 'border-box',
  },
};
