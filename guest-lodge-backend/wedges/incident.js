'use strict';

module.exports = {
  "id": "incident",
  "product": "Incident",
  "webTitle": "Marketel Incident — Write it before anyone goes home",
  "termsScope": "all three",
  "status": "hidden",
  "roleLabels": {
    "staff": "Manager / inspector",
    "witness": "Witness"
  },
  "chooser": "Record what happened and prepare a signed incident record.",
  "offer": {
    "mode": "first-free",
    "reportPrice": 12
  },
  "listTypes": [
    "incident"
  ],
  "types": {
    "incident": {
      "voiceInstruction": "You format a spoken incident note for a record that may be read by an insurer. ${SHARED_VOICE_RULES} Never diagnose, characterise or speculate about injury, medical condition or severity, and never name a cause: record only what the speaker said was reported or observed. Attribute statements to whoever made them. issueMentioned is true only when the speaker explicitly reports harm, damage, a hazard or a security concern. Return the required JSON only.",
      "noun": "detail",
      "nounPlural": "details",
      "seeds": [
        "What happened",
        "Where it happened",
        "Who was involved",
        "What we did"
      ],
      "eyebrow": "New incident record",
      "dateLabel": "Date of the incident",
      "unit": "room",
      "signers": {
        "manager": "staff",
        "other": "witness"
      },
      "disclaimer": "A record of what was reported and observed at the time. Not a legal, medical or insurance determination.",
      "label": "Incident record",
      "brand": "MARKETEL INCIDENT",
      "file": "incident-record.pdf",
      "can": {
        "issueToggle": false,
        "receipts": false,
        "originals": false,
        "shareable": false,
        "location": true,
        "photosOnly": false,
        "free": false,
        "sendable": true,
        "eventTime": "manual",
        "eventWord": "occurred"
      },
      "propertyLabel": "Location / site name",
      "baselineName": "incident",
      "timeLabel": "Time it happened",
      "signatureFallback": "when this document was finalized"
    }
  },
  "skin": {
    "product": "Incident",
    "writesLabel": "it writes",
    "doc": "record",
    "docPlural": "records",
    "comparisons": false,
    "home": "/incident",
    "terms": "https://bookmarketel.com/incident/terms",
    "termsLabel": "Incident terms",
    "navList": "Records",
    "navTabCreate": "+ New Report",
    "navCreate": "+ New record",
    "navPlaces": "Locations",
    "listHeading": "Your records",
    "placesHeading": "Locations",
    "placeSingular": "location",
    "placesLede": "Start a fresh record for a site you have logged before.",
    "placesEmpty": "No locations yet. Add one, or it appears here when you save a record.",
    "propertyPrompt": "Which location?",
    "demoBadge": "EXAMPLE · NOT A REAL INCIDENT",
    "documentLabel": "MARKETEL INCIDENT",
    "offerHeading": "Keep every incident on the record.",
    "offerAnchor": "A single disputed incident costs more than a year of this subscription.",
    "offerPoints": [
      "Talk through what happened and it writes the record",
      "No per-site or per-record fees",
      "Witness signature captured and timed on the record",
      "PDF export on every record"
    ],
    "emptyList": "Start your first one above."
  },
  "landing": {
    "type": "incident",
    "demoSaid": "The guest reported slipping near the lobby entrance at 6 pm. I put out a warning sign and called the manager.",
    "demoNote": "Guest reported slipping near the lobby entrance at 6 pm. A warning sign was placed and the manager was called.",
    "eyebrow": "For hotels, short-lets and venues",
    "title": "Write the incident report<br>before anyone goes home.",
    "lede": "What happened, where, who was involved and what you did — photographed, timed, signed by a witness, and exported as a PDF."
  },
  "demo": null,
  "appStore": {
    "captions": []
  },
  "copy": {
    "nouns": [
      "incident",
      "witness",
      "location"
    ],
    "forbidden": [
      "damage report",
      "check-in",
      "move-out comparison"
    ]
  },
  "selection": "single"
};
