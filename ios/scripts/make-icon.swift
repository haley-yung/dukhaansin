#!/usr/bin/env swift
//
// Generates a 1024x1024 PNG app icon: cream rounded-square weights with
// a chunky bar, on the app's dark background. Run via:
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

// Background — dark cream-on-charcoal palette from CLAUDE.md tokens.
let bg     = CGColor(red: 0x0A/255, green: 0x0A/255, blue: 0x0B/255, alpha: 1)
let cream  = CGColor(red: 0xFA/255, green: 0xFA/255, blue: 0xF7/255, alpha: 1)
let accent = CGColor(red: 0x96/255, green: 0x81/255, blue: 0xC4/255, alpha: 1) // lower_a violet

ctx.setFillColor(bg)
ctx.fill(CGRect(x: 0, y: 0, width: size, height: size))

let cx = size / 2, cy = size / 2

// Soft accent glow underneath for warmth (radial gradient).
let locations: [CGFloat] = [0, 1]
let colors = [
    accent.copy(alpha: 0.30)!,
    accent.copy(alpha: 0.0)!
] as CFArray
if let gradient = CGGradient(colorsSpace: cs, colors: colors, locations: locations) {
    ctx.drawRadialGradient(
        gradient,
        startCenter: CGPoint(x: cx, y: cy), startRadius: 0,
        endCenter:   CGPoint(x: cx, y: cy), endRadius: 460,
        options: []
    )
}

// Geometry: chunky rounded weights with a fat bar.
let weight: CGFloat = 320
let radius: CGFloat = 88
let spacing: CGFloat = 480     // distance between weight centers
let barHeight: CGFloat = 96
let barRadius: CGFloat = 28
let barShrink: CGFloat = 60    // bar inset from each weight center

// Bar (drawn first so weights overlap it cleanly).
let barRect = CGRect(
    x: cx - spacing/2 + barShrink,
    y: cy - barHeight/2,
    width: spacing - 2 * barShrink,
    height: barHeight
)
ctx.addPath(CGPath(roundedRect: barRect, cornerWidth: barRadius, cornerHeight: barRadius, transform: nil))
ctx.setFillColor(cream)
ctx.fillPath()

// Left weight.
let leftRect = CGRect(x: cx - spacing/2 - weight/2, y: cy - weight/2, width: weight, height: weight)
ctx.addPath(CGPath(roundedRect: leftRect, cornerWidth: radius, cornerHeight: radius, transform: nil))
ctx.fillPath()

// Right weight.
let rightRect = CGRect(x: cx + spacing/2 - weight/2, y: cy - weight/2, width: weight, height: weight)
ctx.addPath(CGPath(roundedRect: rightRect, cornerWidth: radius, cornerHeight: radius, transform: nil))
ctx.fillPath()

// Inner darker rectangles inside each weight for a "plate" feel.
let plateInset: CGFloat = 56
let plateRadius: CGFloat = 38
let plate = CGColor(red: 0x18/255, green: 0x18/255, blue: 0x1A/255, alpha: 1)
ctx.setFillColor(plate)

let leftPlate = leftRect.insetBy(dx: plateInset, dy: plateInset)
ctx.addPath(CGPath(roundedRect: leftPlate, cornerWidth: plateRadius, cornerHeight: plateRadius, transform: nil))
ctx.fillPath()

let rightPlate = rightRect.insetBy(dx: plateInset, dy: plateInset)
ctx.addPath(CGPath(roundedRect: rightPlate, cornerWidth: plateRadius, cornerHeight: plateRadius, transform: nil))
ctx.fillPath()

// Tiny accent dot in the center of each plate.
ctx.setFillColor(accent)
let dotR: CGFloat = 18
ctx.fillEllipse(in: CGRect(x: leftPlate.midX - dotR, y: leftPlate.midY - dotR, width: dotR * 2, height: dotR * 2))
ctx.fillEllipse(in: CGRect(x: rightPlate.midX - dotR, y: rightPlate.midY - dotR, width: dotR * 2, height: dotR * 2))

// Encode PNG.
guard let image = ctx.makeImage(),
      let dest = CGImageDestinationCreateWithURL(outURL as CFURL, UTType.png.identifier as CFString, 1, nil)
else { exit(1) }
CGImageDestinationAddImage(dest, image, nil)
guard CGImageDestinationFinalize(dest) else { exit(1) }
print("Wrote \(outURL.path) (\(Int(size))x\(Int(size)) PNG)")
