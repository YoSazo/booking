// Generated from guest-lodge-backend/wedges/*.js. Run npm run wedges:build.
window.MARKETEL_WEDGES = {
  "claims": {
    "id": "claims",
    "product": "Claims",
    "webTitle": "Marketel Claims — Document the damage while it is in front of you",
    "termsScope": "all three",
    "status": "live",
    "roleLabels": {
      "owner": "Owner / host",
      "guest": "Guest"
    },
    "chooser": "Record damage and keep the original uploaded photos.",
    "termsIntro": "Claims reports are free to build and $12 each to send, or included in a plan. Claims produces documentation; it does not file, submit or manage claims with any platform or insurer.",
    "offer": {
      "mode": "pay-at-export",
      "reportPrice": 12
    },
    "listTypes": [
      "damage"
    ],
    "types": {
      "damage": {
        "voiceInstruction": "You format a spoken damage note for a report that may be sent to a platform or an insurer. ${SHARED_VOICE_RULES} Never estimate repair or replacement cost, assign blame, or state a cause: record only the damage as observed and what the speaker said about when it was found. issueMentioned is true only when the speaker explicitly reports damage, breakage, staining or a missing item. Return the required JSON only.",
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
        "eyebrow": "New damage report",
        "dateLabel": "Date you found the damage",
        "unit": "entry",
        "location": false,
        "signers": {
          "manager": "owner",
          "other": "guest"
        },
        "disclaimer": "A dated record of damage as observed. Not a valuation, cause determination or insurance assessment.",
        "label": "Damage report",
        "brand": "MARKETEL CLAIMS",
        "file": "damage-report.pdf",
        "can": {
          "issueToggle": false,
          "receipts": true,
          "originals": true,
          "shareable": true,
          "location": false,
          "photosOnly": false,
          "free": false,
          "sendable": true,
          "eventTime": "first-photo",
          "eventWord": "found",
          "baseline": "check-in",
          "deadline": {
            "days": 14,
            "from": "checkoutDate",
            "field": "Guest checked out",
            "invalid": "Enter a valid check-out date.",
            "text": "14 days after check-out, or before the next guest arrives"
          },
          "signerHint": "Optional. A signature is rarely available after a guest has left."
        },
        "propertyLabel": "Rental property / unit name",
        "baselineName": "damage",
        "timeLabel": "Time you found it",
        "signatureFallback": "when this document was finalized",
        "otherSignerPrompt": "Guest here? Get their signature",
        "linkCopiedMessage": "Link copied. Paste it into your claim or message.",
        "originalsHint": "Original uploaded files are kept as received. PDF and share links use resized copies; no platform is guaranteed to accept a claim."
      },
      "check-in": {
        "voiceInstruction": "You format a spoken damage note for a report that may be sent to a platform or an insurer. ${SHARED_VOICE_RULES} Never estimate repair or replacement cost, assign blame, or state a cause: record only the damage as observed and what the speaker said about when it was found. issueMentioned is true only when the speaker explicitly reports damage, breakage, staining or a missing item. Return the required JSON only.",
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
        "eyebrow": "Check-in",
        "dateLabel": "Check-in date",
        "unit": "room",
        "location": false,
        "photosOnly": true,
        "signers": {
          "manager": "owner",
          "other": "guest"
        },
        "disclaimer": "Photos of the unit's condition at check-in, kept for comparison.",
        "label": "Check-in record",
        "brand": "MARKETEL CLAIMS",
        "file": "check-in-record.pdf",
        "can": {
          "issueToggle": true,
          "receipts": false,
          "originals": false,
          "shareable": true,
          "location": false,
          "photosOnly": true,
          "free": true,
          "sendable": false
        },
        "propertyLabel": "Rental property / unit name",
        "baselineName": "check-in",
        "baselineAction": "Check in",
        "baselineSave": "Save check-in",
        "baselineCaptureHeading": "Photograph each room.",
        "savedEvent": "CheckInSaved",
        "savedSourcePrefix": "inspect-checkin",
        "legacyPropertyField": "latestCheckIn",
        "legacyCountField": "checkInCount"
      }
    },
    "skin": {
      "product": "Claims",
      "writesLabel": "it writes",
      "doc": "report",
      "docPlural": "reports",
      "comparisons": false,
      "navList": "Reports",
      "navTabCreate": "+ New Report",
      "navCreate": "+ New damage report",
      "navPlaces": "Properties",
      "propertyPrompt": "Which rental property?",
      "placesHeading": "Properties",
      "placeSingular": "property",
      "placesLede": "Check a unit in at each turnover. Any damage report after it shows the check-in as the before.",
      "placesEmpty": "No properties yet. Add one, or it appears here when you save a damage report.",
      "home": "/claims",
      "terms": "https://bookmarketel.com/claims/terms",
      "termsLabel": "Claims terms",
      "listHeading": "Your damage reports",
      "demoBadge": "EXAMPLE · NOT REAL DAMAGE",
      "documentLabel": "MARKETEL CLAIMS",
      "offerHeading": "Document it while it is still there.",
      "offerAnchor": "One claim you cannot evidence costs more than a year of this subscription.",
      "offerPoints": [
        "Talk through a room and it writes the note",
        "Every uploaded photo kept as received",
        "No per-property or per-room fees",
        "PDF export and a private share link on every report"
      ],
      "emptyList": "When something is damaged, start one above. Check a unit in from Properties at turnover, and the report shows it as the before."
    },
    "landing": {
      "demoSaid": "Kitchen, chipped counter edge beside the sink. Found it at checkout. I took photos before cleaning.",
      "demoNote": "Chipped counter edge beside the kitchen sink, found at checkout. Photos taken before cleaning.",
      "eyebrow": "For short-let and rental hosts",
      "title": "Document the damage<br>while it is in front of you.",
      "lede": "Room-by-room photos kept as uploaded, with a dated report you can send before the claim window closes.",
      "type": "damage",
      "golden": {
        "headline": "Document guest damage <span class=\"green\">before the claim window closes.</span>",
        "sub": "Build a dated, photo-by-photo damage report in under 3 minutes.",
        "cta": "Build my free damage report →",
        "note": "Free to build. Takes 3 minutes. Pay only when you send it.",
        "proof": "Airbnb asks hosts to request reimbursement within 14 days of checkout.",
        "jobTitle": "Which rental had the damage?",
        "jobLabel": "Rental property / unit",
        "jobPlaceholder": "Pine Ave · Unit 2",
        "building": "Building your damage report",
        "reveal": "Here is what your guest or the platform receives."
      }
    },
    "demo": {
      "heading": "Create your damage report",
      "property": "123 Main Street",
      "unit": "Unit 4B",
      "findings": [
        {
          "id": "wall",
          "label": "Wall damage",
          "room": "Living Room",
          "photo": "claims-wall",
          "said": "hole punched right through the wall by the door",
          "note": "Plasterboard punctured through beside the bedroom door, approx. 15cm across, paint cracked around it."
        },
        {
          "id": "carpet",
          "label": "Carpet stain",
          "room": "Bedroom",
          "photo": "claims-carpet",
          "said": "big red wine stain soaked into the carpet by the drawers",
          "note": "Large red wine stain soaked into the carpet beside the drawers, approx. 50cm, photographed before cleaning."
        },
        {
          "id": "cabinet",
          "label": "Broken cabinet",
          "room": "Kitchen",
          "photo": "claims-cabinet",
          "said": "cabinet door is hanging off, the hinge tore out",
          "note": "Cabinet door detached at the hinge, screw fixings torn out and the surrounding timber split."
        }
      ]
    },
    "appStore": {
      "captions": [
        "Snap the damage. Say what you see.",
        "Keep every original photo",
        "See the check-in beside damage",
        "Send a private link or PDF"
      ]
    },
    "copy": {
      "nouns": [
        "damage",
        "claim",
        "guest",
        "check-in"
      ],
      "forbidden": [
        "Marketel Inspect",
        "Marketel Incident",
        "Marketel Moveout",
        "tenant departure"
      ]
    },
    "selection": "single"
  },
  "incident": {
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
  },
  "inspect": {
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
  },
  "moveout": {
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
        "originalsHint": "Original uploaded files are kept as received. The PDF and private link use dated display copies."
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
  }
};
