# Live Activities — state and what is left

Everything is built, merged to `main`, and deployed except **code signing**. The
feature is one provisioning problem away from working. This document is the
handoff: what exists, exactly where it stops, and the two ways past it.

Last updated after build 1016 (2026-08-17).

---

## 1. What works today

| Piece | Where | State |
|---|---|---|
| Payload, content state, lifecycle rules | `guest-lodge-backend/live-activities.js` | done, 13 tests |
| APNs transport, token registries, decision hooks | `guest-lodge-backend/server.js` | done, **deployed on main** |
| Prisma models `LiveActivity`, `LiveActivityStarter` | `guest-lodge-backend/prisma/schema.prisma` | done, **tables exist in Neon** |
| Registration endpoints | `/api/push/live-activity/{starter,register,ended}` | live, returning 401 not 404 |
| Web registration | `frontdesk/src/live-activity.js` | done, ships in the native bundle |
| Shared attributes | `ios/App/Shared/BookingDecisionAttributes.swift` | compiled into both targets |
| Widget UI | `ios/App/MarketelActivityWidget/MarketelActivityWidget.swift` | compiles |
| Lock Screen intents | `ios/App/MarketelActivityWidget/BookingDecisionIntents.swift` | compiles |
| Capacitor plugin | `ios/App/App/LiveActivityPlugin.{swift,m}` | compiles, in App target |
| Widget target | `ios/App/App.xcodeproj` | **created, embedded, registered** |
| App Group entitlement | both `.entitlements` files | declared, **not yet provisioned** |

The Xcode target was created without a Mac, by
`scripts/add-widget-target.js`. `node scripts/add-widget-target.js --check`
verifies it is registered on the project, embedded in App's build phases, and in
App's dependencies. Both workflows run that check before `cap sync`.

Build 1016 confirms the project is correct — xcodebuild reports 8 targets with
`App ➜ Explicit dependency on MarketelActivityWidgetExtension`.

---

## 2. Where it stops

`Release Marketel Front Desk to TestFlight` with `signing_style: automatic`
fails at **export**:

```
error: exportArchive Cloud signing permission error
error: exportArchive No profiles for 'com.bookmarketel.frontdesk' were found
error: exportArchive No profiles for 'com.bookmarketel.frontdesk.MarketelActivityWidget' were found
```

The App Store Connect API key in GitHub secrets is not permitted to create
signing assets. Cloud signing requires an **Admin** key; a key that can upload
builds cannot necessarily mint certificates.

**First thing to do: read the key's role.** App Store Connect → Users and Access
→ Integrations → App Store Connect API. Find the key matching the
`APP_STORE_CONNECT_KEY_ID` secret and look at its Access column. That single
fact decides which option below applies, and neither should be attempted before
checking it.

---

## 3. Option A — Admin API key (recommended if the key is not Admin)

1. App Store Connect → Users and Access → Integrations → App Store Connect API
2. Generate a key with **Admin** access
3. Update three GitHub secrets: `APP_STORE_CONNECT_KEY_ID`,
   `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_PRIVATE_KEY_BASE64`
   (the private key is base64 of the `.p8`)
4. Re-run the release with `signing_style: automatic`

No workflow changes. Xcode creates both distribution profiles and the App Group
binding itself. Uploads keep working — Admin is a superset of App Manager.

If the team does not use cloud-managed distribution certificates this may still
refuse, in which case fall through to Option B.

## 4. Option B — provision by hand

In the Apple Developer portal:

1. App ID for `com.bookmarketel.frontdesk.MarketelActivityWidget`, with the
   **App Groups** capability
2. App Group `group.com.bookmarketel.frontdesk`, with **both** App IDs as members
3. Add **App Groups** to the existing `com.bookmarketel.frontdesk` App ID — it
   did not need the capability before this branch
4. App Store distribution profiles for **both** bundle ids (regenerate the app's,
   create the widget's)

Then in the repo:

5. Add the widget profile as a base64 secret, install it alongside the app
   profile in *Install distribution certificate and profile*
6. Add the widget mapping to `ios/ExportOptions.plist`:
   ```xml
   <key>com.bookmarketel.frontdesk.MarketelActivityWidget</key>
   <string>NAME_OF_WIDGET_PROFILE</string>
   ```
7. Release with `signing_style: manual`

---

## 5. Signing findings — do not re-derive these

Four archive attempts, each ruling something out:

- **`signing_style: manual`** → *"Provisioning profile doesn't include the App
  Groups capability."* The existing profile predates the App Group entitlement.
  Manual signing cannot work until the profiles are regenerated (Option B).
- **`automatic` with no `CODE_SIGN_IDENTITY`** → *"Your team has no devices from
  which to generate a provisioning profile."* Automatic signing resolves a
  **development** profile to archive with, and development profiles are
  device-scoped. A CI runner will never satisfy that.
- **`automatic` with `CODE_SIGN_IDENTITY=Apple Distribution`** → *"conflicting
  provisioning settings … automatically signed for development."* Same fact from
  the other side: you cannot override the identity that automatic signing has
  already chosen.
- **Archive unsigned, sign at export** (current state) → gets all the way to
  export, then the permission error above. This is the right shape; only the
  key's authority is missing.

The archive step is therefore already correct and should not be changed. The
remaining problem is entirely about *who is allowed to create profiles*.

---

## 6. Traps that already cost four builds

**`project.pbxproj` is CRLF on Windows checkouts.** Any patch matching
multi-line literals with bare `\n` silently fails, because `String.replace`
answers a miss by returning the input unchanged. Four separate edits vanished
that way — the file groups, the embed phase, the target dependency, and the
`PBXProject.targets` entry — and each produced a different, misleading symptom:

- groups missing → Swift files unresolved at build time
- embed phase missing → **built green, shipped an app with no extension inside
  it, and iOS silently issued no push-to-start token**
- targets entry missing → `Unable to resolve build file … missing target with GUID`

The third is the dangerous one: it fails *invisibly*, in a build that passes.
`scripts/add-widget-target.js` now uses line-ending-agnostic patterns and throws
on a miss, and `--check` runs in CI before sync. Keep both.

**A green iOS build does not mean the widget shipped.** Only `--check` proves
that, and only a `LiveActivityStarter` row proves the device agreed.

---

## 7. Verifying it once signing is solved

1. Install the TestFlight build, **open the app once** — registration happens on
   launch, in `initLiveActivities()` after bootstrap.
2. Confirm the device registered:
   ```sql
   select "hotelId", active, "createdAt" from "LiveActivityStarter" order by "createdAt" desc;
   ```
   No row means the client never registered — check that the extension is
   actually inside the `.ipa` (`Payload/App.app/PlugIns/`) before anything else.
3. Make a booking that lands `pending`. The card should appear on the Lock Screen
   with the countdown and Keep / Release.
4. Tap **Keep from the Lock Screen without unlocking**. This is the only test of
   the App Group. If it returns *"Open Marketel and sign in first"*, the group is
   declared but not provisioned — the card and countdown will work, the buttons
   will not.

Live Activities cannot be tested in the simulator over APNs. Real device, iOS
17.2+, which is what push-to-start requires and why the widget target is pinned
to 17.2 while the app stays on 15.0.

---

## 8. Notes for whoever picks this up

- The backend is live on `main` and safe: every `syncBookingLiveActivity` call
  site is `.catch(() => {})`, and the function returns early when APNs is
  unconfigured or the tables are absent. A failed push cannot change a booking
  outcome.
- `live-activities` branch is merged into `main`; there is nothing left on it.
- APNs needs no new configuration. Live Activity pushes reuse the existing key
  and differ only in `apns-topic` (`<bundle>.push-type.liveactivity`) and
  `apns-push-type: liveactivity`, both already set by the server.
- The migration is two additive tables and is already applied to Neon.
