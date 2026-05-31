import SwiftUI

enum Tokens {
    // ─── Surfaces ─────────────────────────────────────────
    static let bg        = Color(red: 0xFA/255, green: 0xF6/255, blue: 0xF1/255)  // cream paper
    static let surface   = Color.white                                              // pure white cards
    static let line      = Color(red: 0xEC/255, green: 0xE5/255, blue: 0xD8/255)  // soft hairline
    static let lineHi    = Color(red: 0xD9/255, green: 0xCF/255, blue: 0xBC/255)  // emphasis border

    // ─── Ink ──────────────────────────────────────────────
    static let heading   = Color(red: 0x1A/255, green: 0x18/255, blue: 0x14/255)  // dark headline
    static let text      = Color(red: 0x2D/255, green: 0x2A/255, blue: 0x26/255)  // body
    static let secondary = Color(red: 0x6B/255, green: 0x66/255, blue: 0x5E/255)  // body secondary
    static let muted     = Color(red: 0x8A/255, green: 0x85/255, blue: 0x7D/255)  // captions

    // ─── Accents ──────────────────────────────────────────
    static let cta       = Color(red: 0x8D/255, green: 0xC6/255, blue: 0xE8/255)  // light blue CTA
    static let onCTA     = Color.white
    static let pink      = Color(red: 0xE8/255, green: 0x95/255, blue: 0x9B/255)  // kawaii rose

    /// Cell + chart colors, tuned for cream backgrounds.
    enum DataViz {
        static let pushRun = Color(red: 0xF8/255, green: 0xC9/255, blue: 0xB5/255)  // peach
        static let legDay  = Color(red: 0xD5/255, green: 0xC7/255, blue: 0xF0/255)  // lavender
        static let pullRun = Color(red: 0xBB/255, green: 0xD3/255, blue: 0xE8/255)  // soft blue
        static let rest    = Color(red: 0xF1/255, green: 0xEC/255, blue: 0xE4/255)  // cream rest
        static let warn    = Color(red: 0xF0/255, green: 0xB9/255, blue: 0x6E/255)  // soft amber
        static let danger  = Color(red: 0xE8/255, green: 0x95/255, blue: 0x9B/255)  // soft pink
        static let good    = Color(red: 0xA8/255, green: 0xD8/255, blue: 0xB9/255)  // soft mint
    }
}

/// Custom font name constants — these are the PostScript names of the
/// bundled TTFs and must match what UIAppFonts in Info.plist registers.
enum Fonts {
    enum Display {
        static let regular   = "BarlowCondensed-Regular"
        static let semibold  = "BarlowCondensed-SemiBold"
        static let bold      = "BarlowCondensed-Bold"
        static let extraBold = "BarlowCondensed-ExtraBold"
    }
    enum Mono {
        static let regular = "JetBrainsMono-Regular"
        static let medium  = "JetBrainsMono-Medium"
    }
}

/// Typographic helper. Display uses bundled Barlow Condensed, body uses
/// system SF Pro (free, crisp, Dynamic-Type friendly), mono uses bundled
/// JetBrains Mono for that characterful data-label look.
enum Type {
    static func display(_ size: CGFloat, weight: Font.Weight = .bold) -> Font {
        let name: String
        switch weight {
        case .black, .heavy: name = Fonts.Display.extraBold
        case .bold:          name = Fonts.Display.bold
        case .semibold, .medium: name = Fonts.Display.semibold
        default:             name = Fonts.Display.regular
        }
        return .custom(name, size: size)
    }

    static func body(_ size: CGFloat = 15, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .default)
    }

    static func mono(_ size: CGFloat = 13, weight: Font.Weight = .regular) -> Font {
        let name = (weight == .medium || weight == .semibold || weight == .bold)
            ? Fonts.Mono.medium
            : Fonts.Mono.regular
        return .custom(name, size: size)
    }
}
