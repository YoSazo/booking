'use strict';

module.exports = {
  "id": "inspect",
  "product": "Inspect",
  "status": "hidden",
  "roleLabels": {
    "manager": "Manager / inspector",
    "resident": "Resident / tenant"
  },
  "chooser": "Walk through rooms and turn photos and notes into a report.",
  "offer": {
    "mode": "first-free",
    "reportPrice": 12
  },
  "listTypes": [
    "routine",
    "move-in",
    "move-out"
  ],
  "types": {
    "routine": {
      "voiceInstruction": "You format a spoken property-condition note. ${SHARED_VOICE_RULES} issueMentioned is true only when the speaker explicitly reports damage, a defect, missing item, cleanliness problem, safety concern, or another issue. Return the required JSON only.",
      "noun": "room",
      "nounPlural": "rooms",
      "seeds": [
        "Kitchen",
        "Bathroom",
        "Bedroom",
        "Living room",
        "Hallway",
        "Closet",
        "Laundry",
        "Balcony"
      ],
      "eyebrow": "New condition report",
      "dateLabel": "Inspection date",
      "unit": "room",
      "signers": {
        "manager": "manager",
        "other": "resident"
      },
      "disclaimer": "Recorded observations only. Not a professional certification. Timestamps do not prove authenticity.",
      "label": "Condition report",
      "brand": "MARKETEL INSPECT",
      "file": "inspection-report.pdf",
      "can": {
        "issueToggle": true,
        "receipts": false,
        "originals": false,
        "shareable": true,
        "location": true,
        "photosOnly": false,
        "free": false,
        "sendable": true
      },
      "propertyLabel": "Property / unit name",
      "baselineName": "condition",
      "pdfLegacy": true
    },
    "move-in": {
      "voiceInstruction": "You format a spoken property-condition note. ${SHARED_VOICE_RULES} issueMentioned is true only when the speaker explicitly reports damage, a defect, missing item, cleanliness problem, safety concern, or another issue. Return the required JSON only.",
      "noun": "room",
      "nounPlural": "rooms",
      "seeds": [
        "Kitchen",
        "Bathroom",
        "Bedroom",
        "Living room",
        "Hallway",
        "Closet",
        "Laundry",
        "Balcony"
      ],
      "eyebrow": "New condition report",
      "dateLabel": "Inspection date",
      "unit": "room",
      "signers": {
        "manager": "manager",
        "other": "resident"
      },
      "disclaimer": "Recorded observations only. Not a professional certification. Timestamps do not prove authenticity.",
      "label": "Move-in report",
      "brand": "MARKETEL INSPECT",
      "file": "inspection-report.pdf",
      "can": {
        "issueToggle": true,
        "receipts": false,
        "originals": false,
        "shareable": true,
        "location": true,
        "photosOnly": false,
        "free": false,
        "sendable": true
      },
      "propertyLabel": "Property / unit name",
      "baselineName": "move-in",
      "pdfLegacy": true
    },
    "move-out": {
      "voiceInstruction": "You format a spoken property-condition note. ${SHARED_VOICE_RULES} issueMentioned is true only when the speaker explicitly reports damage, a defect, missing item, cleanliness problem, safety concern, or another issue. Return the required JSON only.",
      "noun": "room",
      "nounPlural": "rooms",
      "seeds": [
        "Kitchen",
        "Bathroom",
        "Bedroom",
        "Living room",
        "Hallway",
        "Closet",
        "Laundry",
        "Balcony"
      ],
      "eyebrow": "New condition report",
      "dateLabel": "Inspection date",
      "unit": "room",
      "signers": {
        "manager": "manager",
        "other": "resident"
      },
      "disclaimer": "Recorded observations only. Not a professional certification. Timestamps do not prove authenticity.",
      "label": "Move-out report",
      "brand": "MARKETEL INSPECT",
      "file": "inspection-report.pdf",
      "can": {
        "issueToggle": true,
        "receipts": false,
        "originals": false,
        "shareable": true,
        "location": true,
        "photosOnly": false,
        "free": false,
        "sendable": true
      },
      "propertyLabel": "Property / unit name",
      "baselineName": "move-out",
      "pdfLegacy": true
    }
  },
  "skin": {
    "product": "Inspect",
    "writesLabel": "Inspect writes",
    "doc": "report",
    "docPlural": "reports",
    "comparisons": true,
    "home": "/inspect/",
    "terms": "https://bookmarketel.com/inspect/terms.html",
    "termsLabel": "Inspect terms",
    "navList": "Reports",
    "navTabCreate": "+ New Report",
    "navCreate": "+ New report",
    "navPlaces": "Properties",
    "listHeading": "Your reports",
    "placesHeading": "Properties",
    "placeSingular": "property",
    "placesLede": "Start a fresh report, or compare a move-out with the last finalized condition report.",
    "placesEmpty": "No properties yet. Add one, or it appears here when you save a report.",
    "propertyPrompt": "Which property?",
    "demoBadge": "EXAMPLE · NOT A REAL INSPECTION",
    "documentLabel": "MARKETEL INSPECT",
    "offerHeading": "Keep every walkthrough on the record.",
    "offerAnchor": "One argument about damage costs more than a year of Inspect.",
    "offerPoints": [
      "Talk through a room and Inspect writes the note",
      "No per-property or per-room fees",
      "PDF export and a private share link on every report",
      "Before and after move-out comparisons"
    ],
    "emptyList": "Start your first one above."
  },
  "landing": {},
  "demo": {
    "heading": "Create your inspection report",
    "property": "123 Main Street",
    "unit": "Unit 4B",
    "findings": [
      {
        "id": "wall",
        "label": "Wall scuff",
        "room": "Living Room",
        "photo": "inspect-wall",
        "said": "scuff on the wall beside the door, paint has come off",
        "note": "Scuffing and paint loss on the lower wall beside the door frame, approx. 30cm across. Photographed for record."
      },
      {
        "id": "carpet",
        "label": "Carpet wear",
        "room": "Bedroom",
        "photo": "inspect-carpet",
        "said": "carpet is worn flat along the walkway to the hall",
        "note": "Flattened pile and wear along the traffic path between the bedroom and hallway. No staining or tearing."
      },
      {
        "id": "grout",
        "label": "Grout and sealant",
        "room": "Bathroom",
        "photo": "inspect-grout",
        "said": "grout at the bottom of the tiles is going black",
        "note": "Discoloured grout and early mildew along the base of the tiled wall. Cleaning or resealing recommended."
      }
    ]
  },
  "appStore": {
    "captions": []
  },
  "copy": {
    "nouns": [
      "inspect",
      "condition report",
      "property"
    ],
    "forbidden": [
      "damage report",
      "incident record",
      "tenant departure"
    ]
  },
  "selection": "select"
};
