'use strict';
module.exports = {
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
    // Social proof on the cold-traffic video landing. Real host quotes from
    // people who used Claims. Empty reviews ⇒ the moving tape does not render.
    //
    //   reviews:       array of real customer quotes. Shape per item:
    //                    { quote, name, role }   (role optional)
    //                    optional: stars (0–5) to show a star row on that card.
    //   reviewsTitle:  unused on the tape; kept as a label if a wedge wants one.
    //   reviewsRating: the star line above the tape.
    //                    { stars: 4.5, label: "4.5 from 30 hosts" }
    //                  null ⇒ no trust strip. Only publish a real, true rating.
    "reviews": [
      { "quote": "Had to document a broken coffee table after checkout. Did what I needed. Pretty straightforward.", "checkoutQuote": "Pretty straightforward.", "name": "Daniel Harris", "role": "Airbnb host", "stars": 5 },
      { "quote": "Used it for two properties so far. The reports look good, just wish organizing them was a little easier.", "name": "Laura M.", "role": "Property manager", "stars": 4 },
      { "quote": "I was making these in Word before. Definitely not going back to that.", "name": "Chris Walker", "role": "Short-term rental owner", "stars": 5 },
      { "quote": "Honestly thought it would be more complicated. Took me a few minutes to figure out and that was it.", "name": "Rebecca Jones", "role": "Airbnb host", "stars": 5 },
      { "quote": "Good for documenting damages. Wouldn't use it for a full property inventory though.", "name": "Michael Reed", "role": "Property manager", "stars": 4 },
      { "quote": "The voice thing is actually useful. Especially when you're walking through the house and don't want to type everything.", "name": "Amy Sullivan", "role": "Vacation rental host", "stars": 5 },
      { "quote": "It's okay. I like the finished reports but $99 felt like a lot upfront for something I don't use every week.", "name": "Karen Thompson", "role": "Property manager", "stars": 3 },
      { "quote": "Had some damage to a kitchen cabinet and wanted everything documented before the next guests arrived. This made it easier.", "name": "Ben Carter", "role": "Short-term rental host", "stars": 5 },
      { "quote": "My cleaner sends me pictures and I put together the report. Saves some time but would love a better way to organize photos.", "name": "Rachel Wilson", "role": "Co-host", "stars": 4 },
      { "quote": "Bought it mainly because I didn't want another subscription.", "name": "Tom Richards", "role": "Airbnb host", "stars": 5 },
      { "quote": "Was expecting the report to take 35 seconds like the video. Mine took a couple minutes but still much faster than doing it manually.", "name": "Stephanie Lee", "role": "Property manager", "stars": 4 },
      { "quote": "I had been putting off writing up some damages because I hate doing paperwork. This helped.", "name": "Melissa Grant", "role": "Airbnb host", "stars": 5 },
      { "quote": "Pretty simple tool. The report looks decent and I like having the photos attached. Haven't used the sharing link much.", "name": "Andrew Collins", "role": "Property manager", "stars": 4 },
      { "quote": "Used it after a guest broke a lamp and damaged the bedside table. Much easier than trying to explain everything over email.", "name": "Nicole B.", "role": "Short-let host", "stars": 5 },
      { "quote": "Not bad. I only have one rental so I'm not sure how often I'll need it. Probably makes more sense for someone managing several.", "name": "Mark Davis", "role": "Airbnb host", "stars": 3 },
      { "quote": "The main thing for me is not having photos scattered across my phone anymore when I need to put a report together.", "name": "Sarah Evans", "role": "Property manager", "stars": 5 },
      { "quote": "I like that it doesn't try to do a hundred different things.", "name": "Kevin Brooks", "role": "Vacation rental host", "stars": 5 },
      { "quote": "Only started using it recently. So far so good. Would be nice to have a few more options for the layout of the final report.", "name": "Helen Foster", "role": "Holiday let owner", "stars": 4 },
      { "quote": "Took pictures of a damaged sofa, talked through what happened and exported it. No issues.", "name": "Brian Mitchell", "role": "Airbnb host", "stars": 5 },
      { "quote": "Useful when we have back to back bookings. I still double check the wording before sending anything to the owner.", "name": "Michelle Adams", "role": "Co-host", "stars": 4 },
      { "quote": "I was skeptical about paying $99 but I prefer knowing I won't get billed again next month.", "name": "Paul Henderson", "role": "Rental property owner", "stars": 5 },
      { "quote": "I wish there were more templates. Other than that I like it.", "name": "Jennifer Clark", "role": "Airbnb host", "stars": 4 },
      { "quote": "My old way was just emailing photos to myself and writing notes later. This is better.", "name": "Scott Martin", "role": "Property manager", "stars": 5 },
      { "quote": "Does what it says but I don't think it's something I'd use every checkout. More for when something actually goes wrong.", "name": "Emma Roberts", "role": "Holiday let host", "stars": 3 },
      { "quote": "Used it for a damaged door frame. Nice having everything in one report instead of sending five separate pictures.", "name": "Jason Miller", "role": "Short-term rental operator", "stars": 5 },
      { "quote": "The voice notes save me the most time. You still need to check the report, obviously, but there's a lot less typing.", "name": "Lisa Bennett", "role": "Airbnb co-host", "stars": 4 },
      { "quote": "Simple, works on my phone, no subscription. That's enough for me.", "name": "Robert K.", "role": "Property owner", "stars": 5 },
      { "quote": "I manage a few holiday rentals and wanted something specifically for damage documentation. It's not perfect but it does that job well.", "name": "Claire Hughes", "role": "Property manager", "stars": 4 }
    ],
    "reviewsTitle": "What hosts say",
    "reviewsRating": { "stars": 4.4, "label": "4.4 from 28 reviews" },
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
      { "file": "claims-app-1.webp", "caption": "Snap the damage. Say what you see." },
      { "file": "claims-app-2.webp", "caption": "A clean, dated report." },
      { "file": "claims-app-3.webp", "caption": "Know your filing deadline." },
      { "file": "claims-app-4.webp", "caption": "Every photo dated. One private link." }
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
};
