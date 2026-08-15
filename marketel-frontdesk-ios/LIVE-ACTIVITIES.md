# Live Activities — Xcode setup

Everything that can be written and tested outside Xcode is done and on the
`live-activities` branch. What remains needs the Xcode UI, because it means
creating a target and editing entitlements — a hand-edited `project.pbxproj`
that nobody can compile-check is a good way to break the release workflow.

Do this on a Mac with the branch checked out.

---

## What already exists

| Piece | Where | State |
|---|---|---|
| Payload + lifecycle rules | `guest-lodge-backend/live-activities.js` | done, 13 tests |
| APNs transport, token registries, decision hooks | `guest-lodge-backend/server.js` | done |
| Prisma models | `LiveActivityStarter`, `LiveActivity` | done, schema validates |
| Web registration | `frontdesk/src/live-activity.js` | done |
| Shared attributes | `ios/App/Shared/BookingDecisionAttributes.swift` | written |
| Widget UI | `ios/App/MarketelActivityWidget/MarketelActivityWidget.swift` | written |
| Lock Screen intents | `ios/App/MarketelActivityWidget/BookingDecisionIntents.swift` | written |
| Capacitor plugin | `ios/App/App/LiveActivityPlugin.{swift,m}` | written |
| `NSSupportsLiveActivities` | `ios/App/App/Info.plist` | done |

The Swift files exist but **belong to no target yet**. That is the whole job below.

---

## 1. Create the widget extension

1. `ios/App/App.xcodeproj` → **File ▸ New ▸ Target… ▸ Widget Extension**
2. Product name: **MarketelActivityWidget**
3. **Tick "Include Live Activity"**. Untick "Include Configuration App Intent".
4. Embed in **App**. Activate the scheme when prompted.
5. Delete the placeholder `.swift` files Xcode generates in the new group — the
   real ones are already on disk.
6. **Add Files to "App"…** → select `ios/App/MarketelActivityWidget/`, add both
   files to the **MarketelActivityWidget** target only.
7. Set the widget target's **minimum deployment to 17.2**. Push-to-start is
   17.2+, and without it a card can only be raised while the app is already
   open, which defeats the feature. The app target stays at 15.0.

## 2. Share the attributes with both targets

`ios/App/Shared/BookingDecisionAttributes.swift` must be a member of **App**
*and* **MarketelActivityWidget**.

Add the file, then in the File Inspector tick both under Target Membership. If
only one target has it the widget cannot decode what the server sends, and the
activity silently never appears — no error, no crash.

## 3. Add the plugin to the app target

Add `ios/App/App/LiveActivityPlugin.swift` and `LiveActivityPlugin.m` to the
**App** target. The `.m` is required: Capacitor finds plugins through the
Objective-C runtime, so a Swift-only plugin is invisible.

## 4. App Group (this is what makes one-tap work)

Lock Screen buttons run in the widget process and cannot read the webview's
storage, so credentials are passed through an App Group.

1. **Signing & Capabilities** → **+ Capability** → **App Groups** on **both**
   targets
2. Add `group.com.bookmarketel.frontdesk` to both
3. Create the group in the Apple Developer portal and regenerate both
   provisioning profiles

If you skip this, the card still appears and still counts down, but tapping
Keep/Release returns *"Open Marketel and sign in first."*

## 5. APNs

Nothing new to configure. Live Activity pushes use the **same key** as your
existing native pushes; only the topic and push type differ, and the server
already sets them:

```
apns-topic: com.bookmarketel.frontdesk.push-type.liveactivity
apns-push-type: liveactivity
```

## 6. Migration

```bash
cd guest-lodge-backend
npx prisma migrate dev --name live_activities   # local
npx prisma migrate deploy                        # Render
```

Two additive tables, no changes to existing ones — safe to deploy before the
app ships.

---

## Testing it

Live Activities **cannot be tested in the simulator via APNs**. Use a real
device on 17.2+.

1. Sign in on device, confirm `/api/push/live-activity/starter` receives a token
2. Create a pending booking → a card should appear on the Lock Screen with a
   live countdown
3. Tap **Keep it** → booking confirms, card shows "Booking kept", dismisses
   after ~8s
4. **The important one:** raise a card, then decide the booking somewhere else
   entirely — SMS reply, the in-app button, or let the sweep expire it. The card
   must retire itself. This is the invariant the whole design rests on, and it
   is the failure that would annoy owners most: a countdown for a decision
   already made
5. Two overlapping pending bookings → two independent cards, each ending on its
   own decision

## Things that will bite

- **Attributes are frozen at start.** Anything that can change belongs in
  `ContentState`. A renamed field on either side drops the activity silently.
- **8 KB payload limit** on the content state.
- **Push-to-start needs the app to have launched at least once** after install
  before iOS issues the token.
- Users can disable Live Activities per app in Settings —
  `getCapabilities().enabled` reports it. Treat it as normal, not an error.
- The activity is an **extra surface**, never the only one. The existing push
  and SMS still fire, which is what covers Android staff, iOS < 17.2, and anyone
  who turned the feature off.
