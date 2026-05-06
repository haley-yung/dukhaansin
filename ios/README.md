# Gym iOS

Native SwiftUI port of the gym tracker at `apps/gym`. Talks to the same
Supabase backend, so the iOS app and the web app share data.

Status: **Phase 1 — scaffold**. Tab skeleton, data models, design tokens,
and Supabase Swift package are in place. Real data flow lands in phase 2.

## One-time setup

```sh
cd ios
xcodegen generate                     # produces Gym.xcodeproj
cp Gym/Secrets.swift.template Gym/Secrets.swift
# Edit Gym/Secrets.swift and paste your SUPABASE_ANON_KEY.
# (Pull keys from Vercel: `vercel env pull .env.local` from repo root.)
open Gym.xcodeproj
```

In Xcode:

1. Select the `Gym` target → **Signing & Capabilities** → tick **Automatically
   manage signing** and pick your Apple ID under "Team" (a free
   "Personal Team" works for personal-device install).
2. Connect your iPhone, select it as the run destination, hit ⌘R.
3. First install: on the phone, **Settings → General → VPN & Device
   Management → trust your developer profile**.

Free signing expires every 7 days — re-run from Xcode to refresh. The
Apple Developer Program ($99/yr) extends this to 1 year and unlocks
TestFlight + App Store distribution but is otherwise optional.

## Regenerating the Xcode project

`Gym.xcodeproj` is generated from `project.yml`. Re-run after adding source
files or changing build settings:

```sh
xcodegen generate
```

## Layout

```
Gym/
  GymApp.swift              entry point
  Secrets.swift             gitignored, your Supabase URL + anon key
  Models/                   Codable models matching Supabase tables
  Services/                 SupabaseService (phase 2)
  Stores/                   GymStore — @Observable app state
  Theme/                    design tokens (mirrors CLAUDE.md §7)
  Views/                    one folder per tab + shared
  Resources/Assets.xcassets app icon + accent color
```
