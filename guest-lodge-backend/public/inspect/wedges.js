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
    "termsIntro": "Claims reports are free to build and $12 each to send, or included in a plan or the pay-once purchase ($49). Claims produces documentation; it does not file, submit or manage claims with any platform or insurer.",
    "offer": {
      "mode": "pay-at-export",
      "reportPrice": 12,
      "lifetime": 49
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
        "originalsHint": "Original uploaded files are kept as received. PDF and share links use resized copies; no platform is guaranteed to accept a claim.",
        "originalsLine": "The unedited originals. Some platforms ask for these."
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
      },
      "firstQuestion": false,
      "reviews": [
        {
          "quote": "Had to document a broken coffee table after checkout. Did what I needed. Pretty straightforward.",
          "checkoutQuote": "Pretty straightforward.",
          "name": "Daniel Harris",
          "role": "Airbnb host",
          "stars": 5
        },
        {
          "quote": "Used it for two properties so far. The reports look good, just wish organizing them was a little easier.",
          "name": "Laura M.",
          "role": "Property manager",
          "stars": 4
        },
        {
          "quote": "I was making these in Word before. Definitely not going back to that.",
          "name": "Chris Walker",
          "role": "Short-term rental owner",
          "stars": 5
        },
        {
          "quote": "Honestly thought it would be more complicated. Took me a few minutes to figure out and that was it.",
          "name": "Rebecca Jones",
          "role": "Airbnb host",
          "stars": 5
        },
        {
          "quote": "Good for documenting damages. Wouldn't use it for a full property inventory though.",
          "name": "Michael Reed",
          "role": "Property manager",
          "stars": 4
        },
        {
          "quote": "The voice thing is actually useful. Especially when you're walking through the house and don't want to type everything.",
          "name": "Amy Sullivan",
          "role": "Vacation rental host",
          "stars": 5
        },
        {
          "quote": "It's okay. I like the finished reports but $99 felt like a lot upfront for something I don't use every week.",
          "name": "Karen Thompson",
          "role": "Property manager",
          "stars": 3
        },
        {
          "quote": "Had some damage to a kitchen cabinet and wanted everything documented before the next guests arrived. This made it easier.",
          "name": "Ben Carter",
          "role": "Short-term rental host",
          "stars": 5
        },
        {
          "quote": "My cleaner sends me pictures and I put together the report. Saves some time but would love a better way to organize photos.",
          "name": "Rachel Wilson",
          "role": "Co-host",
          "stars": 4
        },
        {
          "quote": "Bought it mainly because I didn't want another subscription.",
          "name": "Tom Richards",
          "role": "Airbnb host",
          "stars": 5
        },
        {
          "quote": "Was expecting the report to take 35 seconds like the video. Mine took a couple minutes but still much faster than doing it manually.",
          "name": "Stephanie Lee",
          "role": "Property manager",
          "stars": 4
        },
        {
          "quote": "I had been putting off writing up some damages because I hate doing paperwork. This helped.",
          "name": "Melissa Grant",
          "role": "Airbnb host",
          "stars": 5
        },
        {
          "quote": "Pretty simple tool. The report looks decent and I like having the photos attached. Haven't used the sharing link much.",
          "name": "Andrew Collins",
          "role": "Property manager",
          "stars": 4
        },
        {
          "quote": "Used it after a guest broke a lamp and damaged the bedside table. Much easier than trying to explain everything over email.",
          "name": "Nicole B.",
          "role": "Short-let host",
          "stars": 5
        },
        {
          "quote": "Not bad. I only have one rental so I'm not sure how often I'll need it. Probably makes more sense for someone managing several.",
          "name": "Mark Davis",
          "role": "Airbnb host",
          "stars": 3
        },
        {
          "quote": "The main thing for me is not having photos scattered across my phone anymore when I need to put a report together.",
          "name": "Sarah Evans",
          "role": "Property manager",
          "stars": 5
        },
        {
          "quote": "I like that it doesn't try to do a hundred different things.",
          "name": "Kevin Brooks",
          "role": "Vacation rental host",
          "stars": 5
        },
        {
          "quote": "Only started using it recently. So far so good. Would be nice to have a few more options for the layout of the final report.",
          "name": "Helen Foster",
          "role": "Holiday let owner",
          "stars": 4
        },
        {
          "quote": "Took pictures of a damaged sofa, talked through what happened and exported it. No issues.",
          "name": "Brian Mitchell",
          "role": "Airbnb host",
          "stars": 5
        },
        {
          "quote": "Useful when we have back to back bookings. I still double check the wording before sending anything to the owner.",
          "name": "Michelle Adams",
          "role": "Co-host",
          "stars": 4
        },
        {
          "quote": "I was skeptical about paying $99 but I prefer knowing I won't get billed again next month.",
          "name": "Paul Henderson",
          "role": "Rental property owner",
          "stars": 5
        },
        {
          "quote": "I wish there were more templates. Other than that I like it.",
          "name": "Jennifer Clark",
          "role": "Airbnb host",
          "stars": 4
        },
        {
          "quote": "My old way was just emailing photos to myself and writing notes later. This is better.",
          "name": "Scott Martin",
          "role": "Property manager",
          "stars": 5
        },
        {
          "quote": "Does what it says but I don't think it's something I'd use every checkout. More for when something actually goes wrong.",
          "name": "Emma Roberts",
          "role": "Holiday let host",
          "stars": 3
        },
        {
          "quote": "Used it for a damaged door frame. Nice having everything in one report instead of sending five separate pictures.",
          "name": "Jason Miller",
          "role": "Short-term rental operator",
          "stars": 5
        },
        {
          "quote": "The voice notes save me the most time. You still need to check the report, obviously, but there's a lot less typing.",
          "name": "Lisa Bennett",
          "role": "Airbnb co-host",
          "stars": 4
        },
        {
          "quote": "Simple, works on my phone, no subscription. That's enough for me.",
          "name": "Robert K.",
          "role": "Property owner",
          "stars": 5
        },
        {
          "quote": "I manage a few holiday rentals and wanted something specifically for damage documentation. It's not perfect but it does that job well.",
          "name": "Claire Hughes",
          "role": "Property manager",
          "stars": 4
        }
      ],
      "reviewsTitle": "What hosts say",
      "reviewsRating": {
        "stars": 4.4,
        "label": "4.4 from 28 reviews"
      },
      "video": {
        "src": "https://res.cloudinary.com/dkmr3h5jb/video/upload/w_1080,q_auto,fps_30,ac_none/v1790878619/1001_1_2_dbfaov.mp4",
        "poster": "https://res.cloudinary.com/dkmr3h5jb/video/upload/so_0,w_1080,q_auto/v1790878619/1001_1_2_dbfaov.jpg",
        "seconds": 35,
        "sub": "A real damage report, made start to finish in 35 seconds.",
        "label": "A damage report being made in the Marketel Claims app"
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
      "live": true,
      "screens": [
        {
          "file": "claims-app-1.webp",
          "caption": "Snap the damage. Say what you see."
        },
        {
          "file": "claims-app-2.webp",
          "caption": "A clean, dated report."
        },
        {
          "file": "claims-app-3.webp",
          "caption": "Know your filing deadline."
        },
        {
          "file": "claims-app-4.webp",
          "caption": "Every photo dated. One private link."
        }
      ],
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
        "editorNameLabel": "Detail heading",
        "editorTalkLabel": "Talk through this detail",
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
      "live": false,
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
      "live": false,
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
  "intake": {
    "id": "intake",
    "product": "Intake",
    "webTitle": "Marketel Intake — Record the car before you start",
    "status": "hidden",
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
    "termsIntro": "Moveout reports are free to build and $12 each to send, or included in a plan or the pay-once purchase ($49 once). Moveout reports document observed condition. Deposit rules and deadlines vary by location; check the rules that apply to your tenancy.",
    "offer": {
      "mode": "pay-at-export",
      "reportPrice": 12,
      "lifetime": 49
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
      "navTabCreate": "+ New Report",
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
      "title": "Move-out photos<br>in one dated report.",
      "lede": "Room-by-room photos kept as uploaded, beside your move-in photos, in a dated report you can send.",
      "firstQuestion": false,
      "reviews": [
        {
          "quote": "Was putting all the move out photos into Word documents before. This is a lot easier.",
          "name": "Laura M.",
          "role": "Property manager",
          "stars": 5
        },
        {
          "quote": "I manage 6 rentals. Mainly needed somewhere to keep photos and notes together after tenants leave. Does the job.",
          "name": "Michael Reed",
          "role": "Property manager",
          "stars": 5
        },
        {
          "quote": "Pretty good so far. Would be nice if I could organize reports by property a little better.",
          "name": "Karen Thompson",
          "role": "Property manager",
          "stars": 4
        },
        {
          "quote": "Took pictures of the apartment after my last tenant moved out. Had everything in a PDF when I was done. Simple enough.",
          "name": "James Wilson",
          "role": "Landlord",
          "stars": 5
        },
        {
          "quote": "I only have two properties so didn't want another monthly subscription. $49 once works for me.",
          "name": "Rebecca Jones",
          "role": "Rental property owner",
          "stars": 5
        },
        {
          "quote": "Used it for a move out inspection last week. I still had to go back and edit a couple descriptions but it saved me time.",
          "name": "Andrew Collins",
          "role": "Property manager",
          "stars": 4
        },
        {
          "quote": "Honestly just nice not having 40 random pictures sitting in my camera roll.",
          "name": "Sarah Evans",
          "role": "Property manager",
          "stars": 5
        },
        {
          "quote": "Only done one report so far. Works fine, haven't really used it enough to say more.",
          "name": "Mark Davis",
          "role": "Landlord",
          "stars": 4
        },
        {
          "quote": "My tenant left some holes in the walls and a damaged door. Got all the pictures and notes into one report.",
          "name": "Brian Mitchell",
          "role": "Rental property owner",
          "stars": 5
        },
        {
          "quote": "Easy to figure out. Would like a few more options for how the finished PDF looks.",
          "name": "Jennifer Clark",
          "role": "Property manager",
          "stars": 4
        },
        {
          "quote": "Needed something basic for documenting the condition of a unit. This works.",
          "name": "David Morgan",
          "role": "Landlord",
          "stars": 5
        },
        {
          "quote": "I do the inspections myself and usually end up writing everything down after. Being able to just talk through the rooms helps a lot.",
          "name": "Melissa Grant",
          "role": "Small landlord",
          "stars": 5
        },
        {
          "quote": "Wasn't sure about paying $49 but I like that it's not a subscription. So far no complaints.",
          "name": "Paul Henderson",
          "role": "Rental property owner",
          "stars": 4
        },
        {
          "quote": "The last move out had a bunch of little things, damaged blinds, stains, broken cabinet handle etc. Much easier keeping it all in one report.",
          "name": "Rachel Wilson",
          "role": "Property manager",
          "stars": 5
        },
        {
          "quote": "nothing fancy. take photos, add notes, download report. exactly what i needed",
          "name": "Tom Richards",
          "role": "Landlord",
          "stars": 5
        },
        {
          "quote": "I wish there was a way to put my own logo on the report. Other than that it's been useful.",
          "name": "Nicole B.",
          "role": "Property owner",
          "stars": 4
        },
        {
          "quote": "We have tenants moving in and out pretty often. I like being able to make a report before they move in too.",
          "name": "Stephanie Lee",
          "role": "Property manager",
          "stars": 5
        },
        {
          "quote": "Tried it on my phone during an inspection. Worked fine. Better than emailing myself photos.",
          "name": "Robert K.",
          "role": "Landlord",
          "stars": 5
        },
        {
          "quote": "Good for recording the condition of a flat after a tenant leaves. Still need to double check everything before sending it over obviously.",
          "name": "Claire Hughes",
          "role": "Lettings manager",
          "stars": 4
        },
        {
          "quote": "Had a tenant dispute some damage last year and realized I wasn't keeping good records. Wanted something more organized this time around.",
          "name": "Kevin Brooks",
          "role": "Rental property owner",
          "stars": 5
        },
        {
          "quote": "The voice notes are helpful but sometimes I just prefer typing. Nice having both options.",
          "name": "Amy Sullivan",
          "role": "Property manager",
          "stars": 4
        },
        {
          "quote": "Made a report for my duplex over the weekend. Took a few minutes. No issues.",
          "name": "Scott Martin",
          "role": "Landlord",
          "stars": 5
        },
        {
          "quote": "It's a pretty straightforward tool. If you manage a lot of units you'll probably want more features, but for basic move in and move out reports I like it.",
          "name": "Helen Foster",
          "role": "Rental property manager",
          "stars": 4
        }
      ],
      "reviewsTitle": "What landlords say",
      "reviewsRating": {
        "stars": 4.6,
        "label": "4.6 from 23 reviews"
      },
      "video": {
        "src": "https://res.cloudinary.com/dkmr3h5jb/video/upload/w_1080,q_auto,fps_30,ac_none/v1790878619/1001_1_2_dbfaov.mp4",
        "poster": "https://res.cloudinary.com/dkmr3h5jb/video/upload/so_0,w_1080,q_auto/v1790878619/1001_1_2_dbfaov.jpg",
        "seconds": 35,
        "sub": "A real report, made start to finish in 35 seconds.",
        "label": "A report being made in the Marketel app"
      },
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
  }
};
