function toIcsDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError('A valid stay date is required');
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function escapeIcsText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/([,;])/g, '\\$1');
}

export function buildStayIcs({ hotel, bookingDetails, reservationCode }) {
  if (!bookingDetails?.checkin || !bookingDetails?.checkout) {
    throw new TypeError('Check-in and checkout are required');
  }
  const propertyName = hotel?.name || 'Your stay';
  const safeUid = String(reservationCode || Date.now()).replace(/[^a-zA-Z0-9._-]/g, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Marketel//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${safeUid}@marketel`,
    `DTSTAMP:${toIcsDate(new Date())}T000000Z`,
    `DTSTART;VALUE=DATE:${toIcsDate(bookingDetails.checkin)}`,
    `DTEND;VALUE=DATE:${toIcsDate(bookingDetails.checkout)}`,
    `SUMMARY:${escapeIcsText(`Stay at ${propertyName}`)}`,
    `DESCRIPTION:${escapeIcsText(`Confirmation #${reservationCode || ''}${hotel?.phone ? `\nQuestions? Call ${hotel.phone}` : ''}`)}`,
    hotel?.address ? `LOCATION:${escapeIcsText(hotel.address)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.join('\r\n');
}

// Build and download an iCalendar file so a guest can add the stay to their
// Apple, Google, or Outlook calendar without sending booking data elsewhere.
export function downloadStayIcs({ hotel, bookingDetails, reservationCode }) {
  const calendar = buildStayIcs({ hotel, bookingDetails, reservationCode });
  const propertyName = hotel?.name || 'Your stay';
  const blob = new Blob([calendar], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${propertyName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-stay.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
