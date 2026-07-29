# Front Desk Assistant

Front Desk Assistant texts verified owners and staff when a direct booking
arrives, asks about outside bookings on a configurable schedule, and can update
Marketel-managed availability from a plain-language reply.

## Required production configuration

Set these variables on the backend:

```text
ENABLE_FRONTDESK_ASSISTANT=true
FRONTDESK_ASSISTANT_SECRET=<long random value>
TWILIO_ACCOUNT_SID=<Twilio account SID>
TWILIO_AUTH_TOKEN=<Twilio auth token>
TWILIO_PHONE_NUMBER=<E.164 Twilio number>
TWILIO_INBOUND_WEBHOOK_URL=https://<backend-host>/api/twilio/frontdesk/inbound
TWILIO_STATUS_CALLBACK_URL=https://<backend-host>/api/twilio/frontdesk/status
TWILIO_VALIDATE_SIGNATURES=true
```

`OPENAI_API_KEY` is optional. Without it, exact replies such as `YES`, `NO`,
`CANCEL`, `KEEP`, and `UNDO` still work, as do simple updates such as
“A walk-in took Queen Room tonight.” With it, less structured availability
updates can be extracted using `OPENAI_ASSISTANT_MODEL`.

In the Twilio number or Messaging Service, configure:

- Incoming message webhook: `POST` to
  `https://<backend-host>/api/twilio/frontdesk/inbound`
- Status callback: `POST` to
  `https://<backend-host>/api/twilio/frontdesk/status`

Use a registered US A2P 10DLC campaign or another compliant sender before
sending production application-to-person traffic in the United States.

## Safety rules

- A phone must complete a six-digit verification before receiving messages.
- A property can connect at most three active phones.
- Natural-language extraction may reduce availability, but it cannot cancel an
  existing guest by itself.
- If a walk-in conflicts with an online booking, Front Desk asks for an
  explicit `CANCEL` or `KEEP`.
- Availability reductions can be undone for ten minutes unless inventory or a
  booking changed afterward.
- Texting endpoints require an active Marketel subscription. The CRM master PIN
  can bypass this only for controlled testing.
- Replying `STOP` disconnects the phone and disables the assistant.

For local UI testing without Twilio, set
`FRONTDESK_ASSISTANT_SMS_DRY_RUN=true` outside production. Verification codes
are returned only in non-production dry-run responses.
