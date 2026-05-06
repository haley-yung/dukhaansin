#!/usr/bin/env swift
//
// Generates a 1024x1024 PNG app icon: chunky cream rounded-square weights
// with a friendly face on the bar, on the app's dark background. Run via:
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
let accent = CGColor(red: 0x96/255, green: 0x81/255, blue: 0xC4/255, alpha: 1) // lower_a violet

// Background.
ctx.setFillColor(bg)
ctx.fill(CGRect(x: 0, y: 0, width: size, height: size))

let cx = size / 2, cy = size / 2

// Soft accent glow underneath the dumbbell for warmth.
let glowColors = [
    accent.copy(alpha: 0.32)!,
    accent.copy(alpha: 0.0)!
] as CFArray
if let gradient = CGGradient(colorsSpace: cs, colors: glowColors, locations: [0, 1]) {
    ctx.drawRadialGradient(
        gradient,
        startCenter: CGPoint(x: cx, y: cy), startRadius: 0,
        endCenter:   CGPoint(x: cx, y: cy), endRadius: 480,
        options: []
    )
}

// Geometry.
let weight: CGFloat = 400
let weightRadius: CGFloat = 130        // rounded, not circle — corners stay visible
let spacing: CGFloat = 540             // distance between weight centers
let barHeight: CGFloat = 170           // narrower than weights so silhouette reads "dumbbell"
let barInset: CGFloat = 80             // bar extends from this far past each weight center

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

// --- Face on the bar ---
// Coordinate note: CGContext y is bottom-up. "Above center" = higher y.
let dark = bg
ctx.setFillColor(dark)

// Eyes: small dark dots, slightly above center.
let eyeR: CGFloat = 22
let eyeOffsetX: CGFloat = 56
let eyeY = cy + 18
ctx.fillEllipse(in: CGRect(x: cx - eyeOffsetX - eyeR, y: eyeY - eyeR, width: eyeR * 2, height: eyeR * 2))
ctx.fillEllipse(in: CGRect(x: cx + eyeOffsetX - eyeR, y: eyeY - eyeR, width: eyeR * 2, height: eyeR * 2))

// Tiny cheek blush — soft pink dots flanking the smile.
let blush = CGColor(red: 0xC9/255, green: 0x7B/255, blue: 0x5E/255, alpha: 0.55)
ctx.setFillColor(blush)
let blushR: CGFloat = 16
let blushOffsetX: CGFloat = 88
let blushY = cy - 22
ctx.fillEllipse(in: CGRect(x: cx - blushOffsetX - blushR, y: blushY - blushR, width: blushR * 2, height: blushR * 2))
ctx.fillEllipse(in: CGRect(x: cx + blushOffsetX - blushR, y: blushY - blushR, width: blushR * 2, height: blushR * 2))

// Smile: small downward arc, stroked.
ctx.setStrokeColor(dark)
ctx.setLineWidth(14)
ctx.setLineCap(.round)
let smileWidth: CGFloat = 90
let smileY = cy - 18
let smile = CGMutablePath()
smile.move(to: CGPoint(x: cx - smileWidth/2, y: smileY + 6))
smile.addQuadCurve(
    to: CGPoint(x: cx + smileWidth/2, y: smileY + 6),
    control: CGPoint(x: cx, y: smileY - 30)
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
