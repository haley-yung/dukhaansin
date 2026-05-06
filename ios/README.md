# Gym iOS

Native SwiftUI port of the gym tracker at `apps/gym`. Talks to the same
`/api/app/gym` Vercel endpoint the web app uses, so the iOS app and web app
share data live.

## Status

All core screens implemented:

- **Today** — header, week/streak/PR stats, GitHub-style heatmap, recent PRs,
  start-session CTA. Pull to refresh.
- **History** — month-grouped expandable cards. Long-press to delete.
- **Analytics** — Swift Charts: training-split bar, 8-week volume,
  full PR list.
- **Body** — date-keyed weight + energy log, 30-point trend chart,
  recent entries.
- **Settings** — exercise library CRUD per training type, template list +
  delete, JSON export to clipboard, JSON import (replaces all data).
- **Workout logger** — sheet with type picker, template chips, per-exercise
  weight/set rows, rest timer with haptics, optional notes, save-as-template.
- **PR celebration** — full-screen overlay when a workout returns new PRs.

Networking goes through `URLSession` against your live Vercel deployment —
no third-party iOS dependencies.

## One-time setup

```sh
cd ios
cp Gym/Secrets.swift.template Gym/Secrets.swift
xcodegen generate
open Gym.xcodeproj
```

In Xcode:

1. Select the `Gym` target → **Signing & Capabilities** → tick
   **Automatically manage signing** and pick your Apple ID under "Team"
   (a free **Personal Team** is fine for personal-device install).
2. Connect your iPhone, select it as the run destination, hit **⌘R**.
3. First install: on the phone, **Settings → General → VPN & Device
   Management → trust your developer profile**.

Free signing expires every 7 days — re-run from Xcode to refresh. The
$99/yr Apple Developer Program extends this to 1 year and unlocks
TestFlight + App Store distribution but is otherwise optional.

## Pointing at local dev

Edit `Gym/Secrets.swift`:

```swift
static let apiBase = URL(string: "http://localhost:3456")!
```

Then run `vercel dev --listen 3456` from the repo root and rebuild.
**Note**: iOS won't allow plain `http://` to non-localhost addresses
without an Info.plist `NSAppTransportSecurity` exception. Localhost works.

## Regenerating the Xcode project

`Gym.xcodeproj` is generated from `project.yml`. Re-run after adding
source files or changing build settings:

```sh
xcodegen generate
```

## Layout

```
Gym/
  GymApp.swift              entry, tab + nav bar appearance
  Secrets.swift             gitignored, holds API base URL
  Models/                   Codable models matching Supabase tables
  Services/GymAPI.swift     URLSession client for /api/app/gym
  Stores/                   GymStore (@Observable) + Stats helpers
  Theme/Tokens.swift        dark color + type tokens
  Views/
    RootView.swift          5-tab TabView shell
    Dashboard/              Today screen + heatmap + PR row + stat tile
    Logger/                 Workout logger sheet + rest timer + drafts
    History/                Month-grouped cards
    Analytics/              Swift Charts views
    Body/                   Weight + energy log + trend
    Settings/               Exercise CRUD, templates, import/export
    PRCelebrationView.swift Full-screen "new PR" overlay
  Resources/Assets.xcassets app icon placeholder + accent color
```
