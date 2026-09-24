'use strict';
module.exports = {
  "id": "fixture",
  "product": "Fixture",
  "webTitle": "Marketel Fixture — Record the unit",
  "status": "draft",
  "roleLabels": {
    "owner": "Owner / host",
    "resident": "Resident / tenant"
  },
  "chooser": "Record a unit and keep a tenant move-in record.",
  "termsIntro": "Fixture records document observed unit condition. Deposit rules and deadlines vary by location; check the rules that apply to your tenancy.",
  "offer": {
    "mode": "pay-at-export",
    "reportPrice": 12
  },
  "listTypes": [
    "fixture-departure"
  ],
  "types": {
    "fixture-departure": {
      "voiceInstruction": "You format a spoken unit condition note. ${SHARED_VOICE_RULES} Preserve only what was observed. Return the required JSON only.",
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
      "eyebrow": "New departure record",
      "dateLabel": "Departure date",
      "unit": "room",
      "location": false,
      "signers": {
        "manager": "owner",
        "other": "resident"
      },
      "disclaimer": "A record of the unit at departure.",
      "label": "Departure record",
      "brand": "MARKETEL FIXTURE",
      "file": "departure-record.pdf",
      "can": {
        "issueToggle": true,
        "receipts": false,
        "originals": false,
        "shareable": false,
        "location": true,
        "photosOnly": false,
        "free": false,
        "sendable": true,
        "eventTime": "manual",
        "eventWord": "observed",
        "baseline": "fixture-arrival",
        "deadline": {
          "text": "Check the deposit return deadline that applies to this tenancy"
        }
      },
      "propertyLabel": "Rental unit / address",
      "baselineName": "departure",
      "timeLabel": "Time you observed it",
      "signatureFallback": "when this document was finalized",
      "otherSignerPrompt": "Tenant here? Get their signature",
      "originalsHint": "Original uploaded files are kept as received. The PDF and private link use dated display copies."
    },
    "fixture-arrival": {
      "voiceInstruction": "You format a spoken unit condition note. ${SHARED_VOICE_RULES} Preserve only what was observed. Return the required JSON only.",
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
      "eyebrow": "Move-in photos",
      "dateLabel": "Tenant move-in date",
      "unit": "room",
      "location": false,
      "photosOnly": true,
      "signers": {
        "manager": "owner",
        "other": "resident"
      },
      "disclaimer": "Photos of the unit at tenant move-in.",
      "label": "Move-in record",
      "brand": "MARKETEL FIXTURE",
      "file": "arrival-record.pdf",
      "can": {
        "issueToggle": false,
        "receipts": false,
        "originals": false,
        "shareable": false,
        "location": false,
        "photosOnly": true,
        "free": true,
        "sendable": false
      },
      "propertyLabel": "Rental unit / address",
      "baselineName": "move-in",
      "baselineAction": "Add move-in photos",
      "baselineSave": "Save move-in photos",
      "baselineCaptureHeading": "Photograph each room.",
      "savedEvent": "MoveInSaved",
      "savedSourcePrefix": "inspect-movein"
    }
  },
  "skin": {
    "product": "Fixture",
    "writesLabel": "it writes",
    "doc": "record",
    "docPlural": "records",
    "comparisons": false,
    "navList": "Records",
    "navCreate": "+ New departure record",
    "navPlaces": "Units",
    "propertyPrompt": "Which unit?",
    "placesHeading": "Units",
    "propertyCreateLabel": "New departure record",
    "placeSingular": "unit",
    "placesLede": "Keep tenant move-in records by unit.",
    "placesEmpty": "No units yet.",
    "home": "/fixture",
    "terms": "https://bookmarketel.com/fixture/terms",
    "termsLabel": "Fixture terms",
    "listHeading": "Your departure records",
    "demoBadge": "EXAMPLE · NOT A REAL TENANCY",
    "documentLabel": "MARKETEL FIXTURE",
    "offerHeading": "Record the unit at departure.",
    "offerAnchor": "Keep a dated unit record.",
    "offerPoints": [
      "Capture unit photos",
      "Keep original files",
      "Compare with move-in records",
      "Export a dated PDF"
    ],
    "emptyList": "Start a departure record above."
  },
  "landing": {
    "type": "fixture-departure",
    "demoSaid": "The bedroom carpet has a dark mark near the wardrobe. I took a photo before cleaning.",
    "demoNote": "Dark mark on the bedroom carpet near the wardrobe, photographed before cleaning.",
    "eyebrow": "For unit managers",
    "title": "Record each unit<br>as a tenant leaves.",
    "lede": "A dated unit record with tenant move-in photos for comparison.",
    "golden": {
      "headline": "Keep a clear <span class=\"green\">departure record.</span>",
      "sub": "Photograph the unit and compare it with tenant move-in photos.",
      "cta": "Build my departure record →",
      "note": "Free to build. Pay only when you send it.",
      "proof": "Keep the record close to the tenancy, and check local deposit deadlines.",
      "jobTitle": "Which unit?",
      "jobLabel": "Unit name",
      "jobPlaceholder": "Oak Street · Unit 2",
      "building": "Building your departure record",
      "reveal": "Here is the departure record."
    }
  },
  "demo": {
    "placeLabel": "Address",
    "unitLabel": "Unit",
    "heading": "Create your departure record",
    "property": "Oak Street",
    "unit": "Unit 2",
    "findings": [
      {
        "id": "carpet",
        "label": "Carpet mark",
        "room": "Bedroom",
        "photo": "fixture-carpet",
        "said": "dark mark on the carpet near the wardrobe",
        "note": "Dark mark on the bedroom carpet near the wardrobe, photographed before cleaning."
      },
      {
        "id": "wall",
        "label": "Wall scuff",
        "room": "Living room",
        "photo": "fixture-wall",
        "said": "scuff on the wall beside the doorway",
        "note": "Scuff on the living room wall beside the doorway, photographed at departure."
      },
      {
        "id": "grout",
        "label": "Bathroom grout",
        "room": "Bathroom",
        "photo": "fixture-grout",
        "said": "dark marks on the bathroom grout",
        "note": "Dark marks visible in the grout around the bath."
      }
    ]
  },
  "appStore": {
    "captions": [
      "Photograph each unit",
      "Compare move-in records",
      "Keep dated tenant evidence",
      "Export a dated PDF"
    ]
  },
  "copy": {
    "nouns": [
      "departure",
      "move-in record",
      "tenant",
      "unit"
    ],
    "forbidden": [
      "Claims",
      "Incident",
      "Inspect",
      "damage",
      "guest",
      "check-in",
      "property",
      "move-out"
    ]
  },
  "selection": "single"
};
