import SwiftUI

enum Tokens {
    static let bg        = Color(red: 0x0A/255, green: 0x0A/255, blue: 0x0B/255)
    static let surface   = Color.white.opacity(0.025)
    static let line      = Color.white.opacity(0.06)
    static let lineHi    = Color.white.opacity(0.12)
    static let text      = Color(red: 0xF2/255, green: 0xF2/255, blue: 0xF0/255)
    static let heading   = Color(red: 0xFA/255, green: 0xFA/255, blue: 0xF7/255)
    static let secondary = Color(red: 0xA6/255, green: 0xA6/255, blue: 0xAB/255)
    static let muted     = Color(red: 0x6F/255, green: 0x6F/255, blue: 0x76/255)

    enum DataViz {
        static let pushRun = Color(red: 0xC9/255, green: 0x7B/255, blue: 0x5E/255)
        static let legDay  = Color(red: 0x96/255, green: 0x81/255, blue: 0xC4/255)
        static let pullRun = Color(red: 0x75/255, green: 0x93/255, blue: 0xC2/255)
        static let rest    = Color(red: 0x3B/255, green: 0x3B/255, blue: 0x40/255)
        static let warn    = Color(red: 0xC9/255, green: 0xA0/255, blue: 0x6E/255)
        static let danger  = Color(red: 0xC5/255, green: 0x6B/255, blue: 0x6B/255)
        static let good    = Color(red: 0x7F/255, green: 0xA9/255, blue: 0x8A/255)
    }
}

enum Type {
    static func display(_ size: CGFloat, weight: Font.Weight = .light) -> Font {
        .system(size: size, weight: weight, design: .default)
    }
    static func body(_ size: CGFloat = 15, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight)
    }
    static func mono(_ size: CGFloat = 13, weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .monospaced)
    }
}
