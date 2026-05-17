#!/usr/bin/env swift
//
// Generates a 1024x1024 PNG app icon: chunky cream rounded-square weights
// with a kawaii face on the bar. Run via:
//
//     swift ios/scripts/make-icon.swift <output.png>
//
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

guard CommandLine.arguments.count == 2 else {
    print("usage: make-icon.swift <output.png>")
    exit(1)
}
let outURL = URL(fileURLWithPath: CommandLine.arguments[1])

let size: CGFloat = 1024
let cs = CGColorSpace(name: CGColorSpace.sRGB)!
guard let ctx = CGContext(
    data: nil,
    width: Int(size), height: Int(size),
    bitsPerComponent: 8, bytesPerRow: 0,
    space: cs,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else { exit(1) }

ctx.setShouldAntialias(true)
ctx.interpolationQuality = .high

// Palette — pulled from CLAUDE.md tokens.
let bg     = CGColor(red: 0x0A/255, green: 0x0A/255, blue: 0x0B/255, alpha: 1)
let cream  = CGColor(red: 0xFA/255, green: 0xFA/255, blue: 0xF7/255, alpha: 1)
let accent = CGColor(red: 0x96/255, green: 0x81/255, blue: 0xC4/255, alpha: 1) // leg_day violet
let blushColor = CGColor(red: 0xE8/255, green: 0x95/255, blue: 0x9B/255, alpha: 0.75)
let white  = CGColor(red: 1, green: 1, blue: 1, alpha: 1)

// Background.
ctx.setFillColor(bg)
ctx.fill(CGRect(x: 0, y: 0, width: size, height: size))

let cx = size / 2, cy = size / 2

// Soft accent glow underneath the dumbbell for warmth.
let glowColors = [
    accent.copy(alpha: 0.40)!,
    accent.copy(alpha: 0.0)!
] as CFArray
if let gradient = CGGradient(colorsSpace: cs, colors: glowColors, locations: [0, 1]) {
    ctx.drawRadialGradient(
        gradient,
        startCenter: CGPoint(x: cx, y: cy), startRadius: 0,
        endCenter:   CGPoint(x: cx, y: cy), endRadius: 500,
        options: []
    )
}

// Two tiny sparkle dots in opposite corners — adds twinkle without clutter.
ctx.setFillColor(white.copy(alpha: 0.65)!)
ctx.fillEllipse(in: CGRect(x: 200, y: size - 240, width: 14, height: 14))
ctx.fillEllipse(in: CGRect(x: size - 220, y: 220, width: 18, height: 18))
ctx.setFillColor(white.copy(alpha: 0.35)!)
ctx.fillEllipse(in: CGRect(x: 260, y: size - 230, width: 8, height: 8))
ctx.fillEllipse(in: CGRect(x: size - 260, y: 230, width: 10, height: 10))

// Geometry.
let weight: CGFloat = 400
let weightRadius: CGFloat = 130
let spacing: CGFloat = 540
let barHeight: CGFloat = 210                // taller bar to fit bigger face
let barInset: CGFloat = 80

// --- Bar (drawn first; weights overlap it) ---
let barLeftX = cx - spacing/2 + barInset
let barWidth = spacing - 2 * barInset
let barRect = CGRect(x: barLeftX, y: cy - barHeight/2, width: barWidth, height: barHeight)
ctx.addPath(CGPath(roundedRect: barRect, cornerWidth: barHeight/2, cornerHeight: barHeight/2, transform: nil))
ctx.setFillColor(cream)
ctx.fillPath()

// --- Weights (rounded squares) ---
let leftRect = CGRect(x: cx - spacing/2 - weight/2, y: cy - weight/2, width: weight, height: weight)
ctx.addPath(CGPath(roundedRect: leftRect, cornerWidth: weightRadius, cornerHeight: weightRadius, transform: nil))
ctx.fillPath()

let rightRect = CGRect(x: cx + spacing/2 - weight/2, y: cy - weight/2, width: weight, height: weight)
ctx.addPath(CGPath(roundedRect: rightRect, cornerWidth: weightRadius, cornerHeight: weightRadius, transform: nil))
ctx.fillPath()

// --- Face on the bar — bigger anime-style eyes with catchlights ---
// Coordinate note: CGContext y is bottom-up. "Above center" = higher y.

// Blush (drawn first so eyes sit on top).
ctx.setFillColor(blushColor)
let blushR: CGFloat = 26
let blushOffsetX: CGFloat = 132
let blushY = cy - 10
ctx.fillEllipse(in: CGRect(x: cx - blushOffsetX - blushR, y: blushY - blushR, width: blushR * 2, height: blushR * 2))
ctx.fillEllipse(in: CGRect(x: cx + blushOffsetX - blushR, y: blushY - blushR, width: blushR * 2, height: blushR * 2))

// Eyes — tall ovals.
let eyeW: CGFloat = 48
let eyeH: CGFloat = 60
let eyeOffsetX: CGFloat = 70
let eyeY = cy + 12

ctx.setFillColor(bg)
ctx.fillEllipse(in: CGRect(x: cx - eyeOffsetX - eyeW/2, y: eyeY - eyeH/2, width: eyeW, height: eyeH))
ctx.fillEllipse(in: CGRect(x: cx + eyeOffsetX - eyeW/2, y: eyeY - eyeH/2, width: eyeW, height: eyeH))

// Eye catchlights — small white circles, upper-right of each eye.
ctx.setFillColor(white)
let catchR: CGFloat = 11
let catchDX: CGFloat = 10
let catchDY: CGFloat = 14
ctx.fillEllipse(in: CGRect(x: cx - eyeOffsetX + catchDX - catchR, y: eyeY + catchDY - catchR, width: catchR * 2, height: catchR * 2))
ctx.fillEllipse(in: CGRect(x: cx + eyeOffsetX + catchDX - catchR, y: eyeY + catchDY - catchR, width: catchR * 2, height: catchR * 2))

// Smile — wider, more curved, thicker stroke.
ctx.setStrokeColor(bg)
ctx.setLineWidth(16)
ctx.setLineCap(.round)
let smileWidth: CGFloat = 100
let smileY = cy - 38
let smile = CGMutablePath()
smile.move(to: CGPoint(x: cx - smileWidth/2, y: smileY + 12))
smile.addQuadCurve(
    to: CGPoint(x: cx + smileWidth/2, y: smileY + 12),
    control: CGPoint(x: cx, y: smileY - 38)
)
ctx.addPath(smile)
ctx.strokePath()

// Encode PNG.
guard let image = ctx.makeImage(),
      let dest = CGImageDestinationCreateWithURL(outURL as CFURL, UTType.png.identifier as CFString, 1, nil)
else { exit(1) }
CGImageDestinationAddImage(dest, image, nil)
guard CGImageDestinationFinalize(dest) else { exit(1) }
print("Wrote \(outURL.path) (\(Int(size))x\(Int(size)) PNG)")
