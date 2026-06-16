# Ambiguity clarification

**Created:** 6/16/2026 16:30:46  
**Updated:** 6/16/2026 16:33:45  
**Exported:** 6/16/2026 16:40:22  
**Link:** [https://claude.ai/chat/a1e0c093-9773-44dc-ab02-4bac70959ccc](https://claude.ai/chat/a1e0c093-9773-44dc-ab02-4bac70959ccc)  

## Assistant:

> 6/16/2026 16:33:45

> Systematically dissected UI ambiguities across tabs and workflows.
>
> - The user wants me to go into extreme detail about WHY the tabs/UI are ambiguous from a user understanding perspective. Let me think through this very carefully.
>   
>   Let me analyze each element of the front desk UI from a first-time user's perspective, looking at every label, interaction, and concept that could cause confusion.
>   
>   Let me go through this systematically:
>   
>   1. **Tab Names**
>   2. **Conceptual ambiguities**
>   3. **Action labels**
>   4. **Status indicators**
>   5. **Workflow clarity**
>   
>   Let me be very detailed and specific.
>   
>   ---
>   
>   **"Settings" Tab**
>   
>   Why is it ambiguous?
>   
>   1. The word "Settings" in every piece of software a hotel owner has ever used — their phone settings, Gmail settings, hotel PMS settings — means configuration of the software itself. PIN, notifications, billing, maybe their email. It does NOT mean "here is where you build and edit the thing your customers see." 
>   
>   2. The first thing inside "Settings" is a "Header Preview" with editable fields for the hotel name, subtitle, address, and phone. This is content editing, not configuration. The user's mental model for "settings" doesn't include "I can change my hotel's name here."
>   
>   3. Photos of rooms are inside "Settings." Photos are the most guest-facing, most marketing-oriented element of the product. Putting them under "Settings" buries the most conversion-critical feature under a label that implies back-office configuration.
>   
>   4. The "Rates" accordion is inside "Settings." Rates are the core commercial offering. In every other hospitality software (Cloudbeds, Guesty, Lodgify), rates are either their own tab or under something like "Pricing" or "Inventory." Calling it "Settings" undersells its importance and mislabels its function.
>   
>   5. The launch checklist appears inside "Bookings" when there are no bookings — but the items on the checklist (add a photo, change rates, copy your link) all point back to "Settings." So the tab that drives first-time activation is "Bookings" but the work happens in "Settings." This…
> - **Done**

## "Settings" Tab

**The word "Settings" carries a universal mental model that this violates.** Every piece of software a hotel owner has ever used — their phone, Gmail, their PMS, QuickBooks — uses "Settings" to mean configuration of the software itself. PIN changes, notification preferences, billing, account details. It never means "here is where you build the thing your customers see." The moment someone reads "Settings" they form an expectation. Everything inside that tab violates it.

**The first thing inside "Settings" is a content editor, not a configuration screen.** The header preview with editable hotel name, subtitle, address, and phone is marketing content. It's what appears on the guest-facing booking page. A hotel owner opening "Settings" expecting to change their PIN instead finds a WYSIWYG editor for their storefront. These are such different categories of task that finding one when expecting the other creates genuine confusion about what this tab is for.

**Room photos are buried under "Settings."** Photos are the single highest-leverage element in converting a browsing guest into a booking. In every hospitality context — Booking.com, Airbnb, Expedia — photos are front and center, prominently accessible, treated as the most important asset. Putting them under a tab called "Settings" implies they're a minor configuration detail. A new hotel owner might spend days wondering why they're not getting bookings without realizing their photo upload is inside "Settings."

**Rates are inside "Settings."** Rates are a commercial decision, not a configuration detail. In every other hotel software — Cloudbeds, Lodgify, Guesty — rates are either their own dedicated section or under "Pricing." Hiding them under "Settings" means an owner who wants to change their price for the weekend has to mentally override their expectation of what "Settings" contains every single time they do it.

**The checkout page editor is inside "Settings."** There is a cancellation policy banner that appears on the guest-facing checkout page, editable from inside "Settings." The owner has no reason to associate "what my guests see during checkout" with "Settings." These feel categorically unrelated.

**The launch checklist points to "Settings" but lives in "Bookings."** When there are no bookings, the Bookings tab shows a to-do list. Every item on that list — add a photo, change rates, copy your link — requires going to Settings. So the tab that drives first-time activation is Bookings, but the work happens in Settings. The user has to shuttle between tabs without either tab's name explaining why.

---

## "Apps" Tab

**"Apps" to a hotel owner means integrations.** The word "apps" in a SaaS dashboard context — across every tool category — means "connect this to other software." Zapier apps. Shopify apps. The app store for your PMS. A hotel owner reading "Apps" will expect to find Stripe, Google Calendar, Expedia sync, maybe WhatsApp. They will not expect to find "save your hotel to a guest's home screen."

**The underlying concept is genuinely novel and requires education before the tab name can mean anything.** A PWA on a guest's home screen is not something most independent hotel owners have a mental model for. Before they can understand what "Apps" means in this context, they need to understand what a PWA is, why it matters, and how it differs from an app store app. The tab name assumes this understanding already exists. It doesn't.

**The "Apps" tab contains two completely separate apps for two completely separate audiences.** Front Desk (for the owner) and the hotel booking app (for guests) are both discussed inside "Apps." These have opposite use cases — one is your management tool, one is your guest's booking tool. The word "Apps" gives no indication that both are here, let alone that they're different things for different people.

**The broadcast/notification feature is inside "Apps."** The ability to send a push notification to all your guests is a messaging feature. It belongs conceptually with communication — near messages, near guest contact. An owner looking to "send a message to all my guests" would not navigate to a tab called "Apps." They'd look in Bookings where the guest messages live, or they'd expect a dedicated messaging section.

**Step 1 of "Apps" is about the owner. Step 3 is about guests.** The tab mixes owner-facing tasks (install Front Desk, upload your logo) with guest-facing tasks (get guests to install your hotel app, broadcast to guests). These require completely different mindsets. The tab name doesn't prepare the owner for the fact that they need to context-switch between "things I do for myself" and "things I do for my guests" within the same page.

---

## "Bookings" Tab

**When empty, it shows a setup checklist — not bookings.** An owner who taps "Bookings" with zero reservations expects to see an empty state that says something like "No bookings yet." Instead they see a launch checklist with tasks about photos, rates, and links. The tab name created an expectation of booking management and delivered setup instructions. Even if the checklist is useful, the mismatch between the tab name and the content creates a moment of "wait, am I in the right place?"

**Guest messages live inside Bookings.** Messaging is distinct enough from booking management that a dedicated section would be expected. If an owner wants to reply to a guest question about WiFi, their instinct is not "I should go to Bookings." Bookings implies reservations, money, dates, rooms. Conversations feel separate. An owner who misses a message might simply never have looked in Bookings for it.

**The badge on the Bookings tab shows total bookings, not actionable ones.** If you have 15 bookings and have dealt with all of them, the badge still shows 15. This means the badge loses its signal value — it stops telling you "there's something to act on" and just tells you "you've had bookings." An owner trained by every other notification system to treat a badge as "unread/new" will eventually stop reading the Bookings badge entirely.

---

## "Availability" Tab

**The default behavior is the opposite of every PMS an experienced hotelier has used.** In standard hotel software — Mews, Opera, Cloudbeds — you have to explicitly open inventory. The default is closed/unavailable and you publish availability. Here, the default is open and you block. An owner coming from any PMS background will open Availability expecting to have to do something to make rooms available, and instead find they're already available, which might make them think the system isn't configured yet.

**Rooms in Availability and rooms in Settings are separate systems that look connected.** You add a room in Settings with a name, photos, and description. You add a room type in Availability with a name and unit count. They share the same naming but serve different masters. Adding a room to Availability doesn't add it to your booking page. Adding a room in Settings doesn't add it to the availability calendar. There is nothing in either place that makes this separation explicit. An owner who adds a room in one place and can't find it in the other will be genuinely confused about what they've done.

**The number on each calendar day isn't labeled.** You see a date and a number. The number means "available units." But without a label, it could mean "bookings on this day," "rooms remaining," "guests arriving," or anything else. The legend at the bottom uses colors (Open, Partial, Full, Closed) but doesn't repeat what the number itself represents.

---

## Broader Conceptual Ambiguities

**"Pay at check-in" on a booking card is unexplained.** The chip says "💳 Pay at check-in" but the booking card doesn't explain the card-hold mechanic. A hotel owner seeing this for the first time has legitimate questions: Did the guest pay anything? Is their card charged? How do I collect the money? Will it automatically charge? The answer — that a $0 or $1 hold was placed to verify the card and the owner collects payment physically at check-in — is explained in the Revenue tab's explainer box, which most owners will never see if revenue tracking isn't enabled. The booking card is the most frequently seen UI in the entire product and it contains a payment model that requires explanation that isn't there.

**The tour and the checklist are parallel flows with overlapping goals in different places.** The tour runs when you first enter Settings. The checklist runs when Bookings is empty. Both push you toward the same three actions: add a photo, set rates, share your link. But they are visually different, triggered by different conditions, live in different tabs, and use different language. An owner who got the tour but didn't complete everything will hit the checklist later and might not recognize it as the same set of tasks. An owner who skipped the tour and jumped to Bookings will hit the checklist without any context about why those three things matter.

**"Check-in QR" in the header is ambiguous.** From the label alone it could be: a QR code for the booking link, a QR code for physical check-in tracking, a QR code for the Wi-Fi password, or a QR code to install the hotel app. It is actually the last one — a full-screen QR that guests scan to install the hotel app — but the name doesn't communicate "this is for getting guests to install your app." An owner who needed a QR code for their booking link would try this button and find something unexpected.

**The Go Live banner appears in a tab the owner has little reason to be in before their first booking.** The banner telling them their page is inactive sits inside the Bookings tab. But before they have any bookings, the most natural place to be is Settings (setting up the page) or Apps (following the tour). An owner who completes setup in Settings, follows the tour, feels ready, and then waits for bookings might never see the Go Live banner and genuinely not know their page is still inactive.

**"Redo Tour" in the header looks like a developer debug button.** It's labeled with a reload emoji and the words "Redo Tour" which implies technical scaffolding left visible by accident, not a legitimate user-facing feature. An owner who is confused about how the product works and wants to re-watch the walkthrough won't associate "Redo Tour" with that need. They'd look for something like "Help" or "How it works."

**The two "Add room type" entry points do different things with no indication they're separate systems.** In Availability, the "Add room type" button creates a room for calendar-based availability management. In Settings, there is an "Add room type" button that creates a room for the guest-facing booking page — with photos, description, and amenities. Both say "Add room type." Neither explains that it only affects its own system. An owner who carefully adds a room with a beautiful photo in Settings will go to Availability and find it empty, or vice versa, with no explanation of why.

Powered by Claude Exporter (https://www.ai-chat-exporter.net)
