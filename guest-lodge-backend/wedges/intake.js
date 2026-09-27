'use strict';
// Detailers. The ad: "Detailers, if a customer says you scratched their car and
// you don't have dated photos from before you started, you're paying for it
// yourself." One report, made at drop-off and signed by the customer there, so
// the argument never starts. No simulation: the landing is a real-time video
// of the app (landing.video) once it is recorded.
module.exports = {
  "id": "intake",
  "product": "Intake",
  "webTitle": "Marketel Intake — Record the car before you start",
  "status": "live",
  "roleLabels": {
    "detailer": "Detailer",
    "customer": "Customer"
  },
  "chooser": "Record a car's condition, signed by the customer, before you start.",
  "termsIntro": "Intake reports are free to build and $12 each to send, or included in a plan. An intake report records visible condition at drop-off; it does not decide cause, repair or responsibility.",
  "offer": {
    "mode": "pay-at-export",
    "reportPrice": 12
  },
  "listTypes": [
    "vehicle-intake"
  ],
  "types": {
    "vehicle-intake": {
      "voiceInstruction": "You format a spoken note about a vehicle's visible condition for a report the customer signs at drop-off. ${SHARED_VOICE_RULES} Record only the part of the vehicle and the visible mark in plain words, and what the speaker said about when it was seen. Never state a cause, blame anyone, guess how old a mark is, or mention repair, cost, safety or insurance. issueMentioned is true only when the speaker explicitly reports a scratch, dent, chip, stain, tear or missing item. Return the required JSON only.",
      "noun": "area",
      "nounPlural": "areas",
      "seeds": [
        "Front bumper",
        "Rear bumper",
        "Driver side",
        "Passenger side",
        "Hood",
        "Wheels",
        "Windshield",
        "Interior"
      ],
      "eyebrow": "New intake report",
      "dateLabel": "Drop-off date",
      "unit": "entry",
      "location": false,
      "signers": {
        "manager": "detailer",
        "other": "customer"
      },
      "disclaimer": "A dated record of the vehicle's visible condition at drop-off. Not a repair estimate, cause determination or safety inspection.",
      "label": "Intake report",
      "brand": "MARKETEL INTAKE",
      "file": "intake-report.pdf",
      "can": {
        "issueToggle": false,
        "receipts": false,
        "originals": true,
        "shareable": true,
        "location": false,
        "photosOnly": false,
        "free": false,
        "sendable": true,
        "eventTime": "first-photo",
        "eventWord": "photographed",
        "signerHint": "Optional. The customer signs to show they saw this record before work started."
      },
      "capture": {
        "ask": "Which part of the car?",
        "another": "another part",
        "missing": "Type which part of the car this is."
      },
      "propertyLabel": "Vehicle / job",
      "timeLabel": "Time photographed",
      "signatureFallback": "when this report was finalized",
      "otherSignerPrompt": "Customer here? Get their signature",
      "linkCopiedMessage": "Link copied. Send it to your customer.",
      "originalsHint": "Original uploaded files are kept as received. The PDF and share link use dated display copies.",
      "originalsLine": "The unedited originals, as uploaded."
    }
  },
  "skin": {
    "product": "Intake",
    "writesLabel": "it writes",
    "doc": "report",
    "docPlural": "reports",
    "comparisons": false,
    "navList": "Reports",
    "navTabCreate": "+ New Report",
    "navCreate": "+ New intake report",
    "navPlaces": "Vehicles",
    "propertyPrompt": "Which vehicle?",
    "placesHeading": "Vehicles",
    "placeSingular": "vehicle",
    "placesLede": "Every vehicle you have recorded, with its intake reports.",
    "placesEmpty": "No vehicles yet. They appear here when you save an intake report.",
    "home": "/intake",
    "terms": "https://bookmarketel.com/intake/terms",
    "termsLabel": "Intake terms",
    "listHeading": "Your intake reports",
    "demoBadge": "EXAMPLE · NOT A REAL VEHICLE",
    "documentLabel": "MARKETEL INTAKE",
    "offerHeading": "Record it before you start.",
    "offerAnchor": "One scratch you did not cause costs more than a year of this subscription.",
    "offerPoints": [
      "Snap the car, say what you see, and it writes the report",
      "Your customer signs it before you start",
      "Every photo dated, originals kept as uploaded",
      "A PDF and a private link to send"
    ],
    "emptyList": "When a car comes in, start one above before you touch it."
  },
  "landing": {
    "demoSaid": "Front bumper, white scuff under the left headlight, it was there when it came in.",
    "demoNote": "White scuff on the front bumper below the left headlight, present at drop-off.",
    "eyebrow": "For detailers",
    "title": "Record the car<br>before you start.",
    "lede": "Dated photos of the car's condition, signed by your customer, before you touch it.",
    "type": "vehicle-intake",
    "golden": {
      "headline": "Stop paying for scratches <span class=\"green\">that were already there.</span>",
      "sub": "Build a dated intake report in under 3 minutes, signed by your customer before you start.",
      "cta": "Build my free intake report →",
      "note": "Free to build. Pay only when you send it.",
      "proof": "Works with whatever you use to book jobs, even texts.",
      "jobTitle": "Which vehicle is this?",
      "jobLabel": "Vehicle / job",
      "jobPlaceholder": "White Tacoma · Job 1042",
      "building": "Building your intake report",
      "reveal": "Here is what your customer receives."
    }
  },
  "appStore": {
    "live": false,
    "captions": [
      "Snap the car. Say what you see.",
      "Your customer signs before you start",
      "Every photo dated",
      "Send a private link or PDF"
    ]
  },
  "copy": {
    "nouns": [
      "intake",
      "vehicle",
      "detailer"
    ],
    "forbidden": [
      "Marketel Claims",
      "Marketel Inspect",
      "Marketel Incident",
      "Marketel Moveout",
      "guest",
      "tenant",
      "claim window"
    ]
  },
  "selection": "single"
};
