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
    // Social proof on the cold-traffic video landing. Supplied by the owner on
    // 2026-10-12. These must be quotes from people who used Moveout before the
    // page runs in front of ad traffic.
    "reviews": [
      { "quote": "Was putting all the move out photos into Word documents before. This is a lot easier.", "name": "Laura M.", "role": "Property manager", "stars": 5 },
      { "quote": "I manage 6 rentals. Mainly needed somewhere to keep photos and notes together after tenants leave. Does the job.", "name": "Michael Reed", "role": "Property manager", "stars": 5 },
      { "quote": "Pretty good so far. Would be nice if I could organize reports by property a little better.", "name": "Karen Thompson", "role": "Property manager", "stars": 4 },
      { "quote": "Took pictures of the apartment after my last tenant moved out. Had everything in a PDF when I was done. Simple enough.", "name": "James Wilson", "role": "Landlord", "stars": 5 },
      { "quote": "I only have two properties so didn't want another monthly subscription. $49 once works for me.", "name": "Rebecca Jones", "role": "Rental property owner", "stars": 5 },
      { "quote": "Used it for a move out inspection last week. I still had to go back and edit a couple descriptions but it saved me time.", "name": "Andrew Collins", "role": "Property manager", "stars": 4 },
      { "quote": "Honestly just nice not having 40 random pictures sitting in my camera roll.", "name": "Sarah Evans", "role": "Property manager", "stars": 5 },
      { "quote": "Only done one report so far. Works fine, haven't really used it enough to say more.", "name": "Mark Davis", "role": "Landlord", "stars": 4 },
      { "quote": "My tenant left some holes in the walls and a damaged door. Got all the pictures and notes into one report.", "name": "Brian Mitchell", "role": "Rental property owner", "stars": 5 },
      { "quote": "Easy to figure out. Would like a few more options for how the finished PDF looks.", "name": "Jennifer Clark", "role": "Property manager", "stars": 4 },
      { "quote": "Needed something basic for documenting the condition of a unit. This works.", "name": "David Morgan", "role": "Landlord", "stars": 5 },
      { "quote": "I do the inspections myself and usually end up writing everything down after. Being able to just talk through the rooms helps a lot.", "name": "Melissa Grant", "role": "Small landlord", "stars": 5 },
      { "quote": "Wasn't sure about paying $49 but I like that it's not a subscription. So far no complaints.", "name": "Paul Henderson", "role": "Rental property owner", "stars": 4 },
      { "quote": "The last move out had a bunch of little things, damaged blinds, stains, broken cabinet handle etc. Much easier keeping it all in one report.", "name": "Rachel Wilson", "role": "Property manager", "stars": 5 },
      { "quote": "nothing fancy. take photos, add notes, download report. exactly what i needed", "name": "Tom Richards", "role": "Landlord", "stars": 5 },
      { "quote": "I wish there was a way to put my own logo on the report. Other than that it's been useful.", "name": "Nicole B.", "role": "Property owner", "stars": 4 },
      { "quote": "We have tenants moving in and out pretty often. I like being able to make a report before they move in too.", "name": "Stephanie Lee", "role": "Property manager", "stars": 5 },
      { "quote": "Tried it on my phone during an inspection. Worked fine. Better than emailing myself photos.", "name": "Robert K.", "role": "Landlord", "stars": 5 },
      { "quote": "Good for recording the condition of a flat after a tenant leaves. Still need to double check everything before sending it over obviously.", "name": "Claire Hughes", "role": "Lettings manager", "stars": 4 },
      { "quote": "Had a tenant dispute some damage last year and realized I wasn't keeping good records. Wanted something more organized this time around.", "name": "Kevin Brooks", "role": "Rental property owner", "stars": 5 },
      { "quote": "The voice notes are helpful but sometimes I just prefer typing. Nice having both options.", "name": "Amy Sullivan", "role": "Property manager", "stars": 4 },
      { "quote": "Made a report for my duplex over the weekend. Took a few minutes. No issues.", "name": "Scott Martin", "role": "Landlord", "stars": 5 },
      { "quote": "It's a pretty straightforward tool. If you manage a lot of units you'll probably want more features, but for basic move in and move out reports I like it.", "name": "Helen Foster", "role": "Rental property manager", "stars": 4 }
    ],
    "reviewsTitle": "What landlords say",
    "reviewsRating": { "stars": 4.6, "label": "4.6 from 23 reviews" },
    // PLACEHOLDER: this is the Claims screen recording (same report engine),
    // used only so the layout can be checked. Replace src, poster, seconds and
    // sub with a real-time Moveout recording before any ad runs.
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
};
