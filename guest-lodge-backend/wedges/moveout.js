'use strict';
module.exports = {
  "id": "moveout",
  "product": "Moveout",
  "webTitle": "Marketel Moveout — Document the unit at move-out",
  "status": "draft",
  "roleLabels": {
    "owner": "Owner / host",
    "resident": "Resident / tenant"
  },
  "chooser": "Record a tenant move-out and compare it with move-in photos.",
  "termsIntro": "Moveout reports document observed condition. Deposit rules and deadlines vary by location; check the rules that apply to your tenancy.",
  "offer": {
    "mode": "pay-at-export",
    "reportPrice": 12
  },
  "listTypes": [
    "landlord-move-out"
  ],
  "types": {
    "landlord-move-out": {
      "voiceInstruction": "You format a spoken unit condition note at tenant move-out. ${SHARED_VOICE_RULES} Record observed condition only. Do not assign blame, decide a deposit deduction or state a legal deadline. Return the required JSON only.",
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
      "eyebrow": "New move-out report",
      "dateLabel": "Move-out date",
      "unit": "room",
      "location": false,
      "signers": {
        "manager": "owner",
        "other": "resident"
      },
      "disclaimer": "A record of observed condition at move-out. Deposit deductions and return deadlines depend on local law and the tenancy agreement.",
      "label": "Move-out report",
      "brand": "MARKETEL MOVEOUT",
      "file": "moveout-report.pdf",
      "can": {
        "issueToggle": true,
        "receipts": false,
        "originals": true,
        "shareable": true,
        "location": false,
        "photosOnly": false,
        "free": false,
        "sendable": true,
        "eventTime": "manual",
        "eventWord": "observed",
        "baseline": "landlord-move-in",
        "deadline": {
          "text": "Check the deposit return deadline that applies to this tenancy"
        },
        "signerHint": "Signatures are optional. Invite the tenant only if they are present."
      },
      "propertyLabel": "Rental unit / address",
      "baselineName": "move-out",
      "timeLabel": "Time you observed it",
      "signatureFallback": "when this document was finalized",
      "otherSignerPrompt": "Tenant here? Get their signature",
      "originalsHint": "Original uploaded files are kept as received. The PDF and private link use dated display copies.",
      "originalsLine": "The unedited originals, kept exactly as uploaded."
    },
    "landlord-move-in": {
      "voiceInstruction": "You format a spoken unit condition note at tenant move-out. ${SHARED_VOICE_RULES} Record observed condition only. Do not assign blame, decide a deposit deduction or state a legal deadline. Return the required JSON only.",
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
      "dateLabel": "Move-in date",
      "unit": "room",
      "location": false,
      "photosOnly": true,
      "signers": {
        "manager": "owner",
        "other": "resident"
      },
      "disclaimer": "Photos of the unit at move-in, kept as a dated baseline for comparison.",
      "label": "Move-in record",
      "brand": "MARKETEL MOVEOUT",
      "file": "movein-record.pdf",
      "can": {
        "issueToggle": false,
        "receipts": false,
        "originals": false,
        "shareable": true,
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
    "product": "Moveout",
    "writesLabel": "it writes",
    "doc": "report",
    "docPlural": "reports",
    "comparisons": false,
    "navList": "Reports",
    "navCreate": "+ New move-out report",
    "navPlaces": "Units",
    "propertyPrompt": "Which rental unit?",
    "placesHeading": "Units",
    "propertyCreateLabel": "New move-out report",
    "placeSingular": "unit",
    "placesLede": "Keep dated move-in photos for each unit. Compare them with the move-out record when a tenancy ends.",
    "placesEmpty": "No units yet. Add one, or it appears when you save a report.",
    "home": "/moveout",
    "terms": "https://bookmarketel.com/moveout/terms",
    "termsLabel": "Moveout terms",
    "listHeading": "Your move-out reports",
    "demoBadge": "EXAMPLE · NOT A REAL TENANCY",
    "documentLabel": "MARKETEL MOVEOUT",
    "offerHeading": "Record the unit as the tenant leaves.",
    "offerAnchor": "A clear move-in and move-out record helps explain a proposed deduction.",
    "offerPoints": [
      "Photograph each room as it looks now",
      "Keep the original uploaded photos",
      "Compare with your dated move-in photos",
      "Share a PDF or private link"
    ],
    "emptyList": "Start your first move-out report above. Add move-in photos from Units for a before view."
  },
  "landing": {
    "type": "landlord-move-out",
    "demoSaid": "The bedroom carpet has a dark mark near the wardrobe. I took a photo before cleaning.",
    "demoNote": "Dark mark on the bedroom carpet near the wardrobe, photographed before cleaning.",
    "eyebrow": "For landlords and property managers",
    "title": "Document move-out<br>room by room.",
    "lede": "Put dated move-in and move-out photos side by side in a report you can share.",
    "golden": {
      "headline": "A clearer move-out record <span class=\"green\">starts before the keys are returned.</span>",
      "sub": "Photograph the unit room by room and compare it with move-in photos.",
      "cta": "Build my move-out report →",
      "note": "Free to build. Pay only when you send it.",
      "proof": "Keep the record close to the tenancy, and check local deposit deadlines.",
      "jobTitle": "Which unit is moving out?",
      "jobLabel": "Rental unit / address",
      "jobPlaceholder": "Oak Street · Unit 2",
      "building": "Building your move-out report",
      "reveal": "Here is the move-out report you can share."
    }
  },
  "demo": {
    "placeLabel": "Address",
    "unitLabel": "Unit",
    "heading": "Create your move-out report",
    "property": "Oak Street",
    "unit": "Unit 2",
    "findings": [
      {
        "id": "carpet",
        "label": "Carpet mark",
        "room": "Bedroom",
        "photo": "moveout-carpet",
        "said": "dark mark on the carpet near the wardrobe",
        "note": "Dark mark on the bedroom carpet near the wardrobe, photographed before cleaning."
      },
      {
        "id": "wall",
        "label": "Wall scuff",
        "room": "Living room",
        "photo": "moveout-wall",
        "said": "scuff on the wall beside the doorway",
        "note": "Scuff on the living room wall beside the doorway, photographed at move-out."
      },
      {
        "id": "grout",
        "label": "Bathroom grout",
        "room": "Bathroom",
        "photo": "moveout-grout",
        "said": "dark marks on the bathroom grout",
        "note": "Dark marks visible in the grout around the bath."
      }
    ]
  },
  "appStore": {
    "live": false,
    "captions": [
      "Photograph the unit room by room",
      "Compare move-in and move-out photos",
      "Keep a dated record you can share",
      "Send a PDF or private link"
    ]
  },
  "copy": {
    "nouns": [
      "move-out",
      "move-in",
      "tenant",
      "unit"
    ],
    "forbidden": [
      "Claims",
      "Incident",
      "Check-in",
      "guest damage",
      "Marketel Inspect"
    ]
  },
  "selection": "single"
};
