# Moveout wedge brief

Research checked September 24, 2026. This is a product brief, not legal guidance.

## Job and audience

A landlord or property manager wants a clear record of a unit at move-out, close to the moment a tenant leaves. The product's job is to keep dated photos and short observations by room, pair them with the unit's free move-in photos, and export a readable PDF or private link. It does not decide deductions, fair wear, liability, or whether a claim will succeed.

## What people struggle with

- A property manager asked for a way to condense **all** move-out photos into one PDF because moving dozens of photos into an existing property system was cumbersome. [Reddit discussion](https://www.reddit.com/r/PropertyManagement/comments/1icgsjg).
- Another discussion describes hours spent assembling documentation, disorganized photos, and ambiguous adjectives in reports. This supports room grouping, dated photos, and neutral observations. [Reddit discussion](https://www.reddit.com/r/PropertyManagement/comments/1pl0zsb/how_to_handle_moveinmoveout_inspection/).
- An [App Store review of RentCheck](https://apps.apple.com/us/app/rentcheck/id1134017691?platform=ipad) says required photos and questions made one three-bedroom inspection take over four hours. A [zTenant review](https://apps.apple.com/us/app/ztenant/id1491039980) similarly objects to being forced to photograph areas to advance. Moveout therefore keeps the capture path free of checklists and required shot counts.
- A [Property Management discussion](https://www.reddit.com/r/PropertyManagement/comments/1tvawxe/inspection_toolapp/) calls another move-out app more than needed in some ways and less in others. This is a reason to keep the first job narrow and test the end-to-end path, rather than claim feature breadth.
- Texas's [Property Code §92.103 and §92.107](https://statutes.capitol.texas.gov/?artSec=92.109&chapter=PR.92&code=PR&tab=1) illustrate why a universal computed deposit date is unsafe: the return provision and forwarding-address condition interact. The wedge shows text reminding the operator to check the applicable deadline; it computes no date.

## Product decisions

- One free photos-only move-in baseline per unit, with no author field required to save. The latest finalized baseline is offered automatically for that unit.
- Move-out has a distinct report type and remains `draft` until owner review. It cannot be mixed into Inspect's move-in and move-out lists.
- Photos and observations use room names for before/after pairing. A missing before photo is left blank rather than implying a match.
- Signing is optional. The report records what was observed and avoids conclusions about deposit deductions.
- Pay at export, using the shared account, $12 single report, and $25 monthly plan. The user can build and preview before deciding.

## Review and handoff

The checker writes phone-sized screenshots and a demo recording to `artifacts/wedges/moveout/`. These are browser renderings; inspect them on a phone before using them for App Store material. Suggested ad hook: “Move-out photos in one dated report.” Show a room photo, its move-in comparison, then the PDF and link. Say “free to build” and “works alongside your existing property system”; do not imply a deposit decision or a legal deadline.

**UGC script:** “When a tenant leaves, I used to have photos scattered across my phone. I open Marketel Moveout, photograph each room, and talk through what I see. The report puts those photos beside the move-in record and gives me a dated PDF and private link. It works with the property system I already use. I can build it free and decide whether to send it when I see the preview.”

**Primary text:** Move-in and move-out photos, paired by room in a dated report. Build it free, then export a PDF or private link when it is ready.

**Headline:** Move-out photos in one report

**Description:** Room-by-room evidence, ready to share.
