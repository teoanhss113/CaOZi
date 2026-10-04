import ActivityKit
import SwiftUI
import UIKit
import WidgetKit

@available(iOSApplicationExtension 16.1, *)
struct CaOZPetLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: PetActivityAttributes.self) { context in
      PetLockScreenView(state: context.state)
        .activityBackgroundTint(PetDynamicIslandColor.surface)
        .activitySystemActionForegroundColor(.white)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          PetExpandedBadge(state: context.state, label: "Pet đang chọn")
            .dynamicIsland(verticalPlacement: .belowIfTooWide)
        }

        DynamicIslandExpandedRegion(.trailing) {
          VStack(alignment: .trailing, spacing: 2) {
            Text(context.state.shortName)
              .font(.headline)
              .fontWeight(.bold)
              .foregroundStyle(.white)
              .lineLimit(1)

            Text(context.state.elementName)
              .font(.caption2)
              .foregroundStyle(.white.opacity(0.72))
          }
          .frame(maxWidth: .infinity, alignment: .trailing)
        }

        DynamicIslandExpandedRegion(.bottom) {
          PetOrbitView(state: context.state)
        }
      } compactLeading: {
        PetArtwork(state: context.state, size: 28, showsOrb: false)
      } compactTrailing: {
        Text((context.state.petPoseKey ?? String(context.state.shortName.prefix(3))).uppercased())
          .font(.caption2)
          .fontWeight(.bold)
          .foregroundStyle(.white)
      } minimal: {
        PetArtwork(state: context.state, size: 24, showsOrb: false)
      }
      .keylineTint(PetDynamicIslandColor.from(hex: context.state.elementColorHex))
    }
  }
}

@available(iOSApplicationExtension 16.1, *)
private struct PetLockScreenView: View {
  let state: PetActivityAttributes.ContentState

  var body: some View {
    HStack(spacing: 12) {
      PetArtwork(state: state, size: 56)

      VStack(alignment: .leading, spacing: 3) {
        Text("Pet đang chọn")
          .font(.caption)
          .foregroundStyle(.white.opacity(0.68))

        Text(state.skinName)
          .font(.headline)
          .fontWeight(.bold)
          .foregroundStyle(.white)
          .lineLimit(1)

        Text(state.petPoseLabel ?? "Đang đồng bộ pose")
          .font(.caption2)
          .foregroundStyle(.white.opacity(0.58))
          .lineLimit(1)
      }

      Spacer(minLength: 8)

      Text(state.elementName)
        .font(.caption)
        .fontWeight(.semibold)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .foregroundStyle(.white)
        .background(PetDynamicIslandColor.from(hex: state.elementColorHex).opacity(0.75))
        .clipShape(Capsule())
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 12)
  }
}

@available(iOSApplicationExtension 16.1, *)
private struct PetExpandedBadge: View {
  let state: PetActivityAttributes.ContentState
  let label: String

  var body: some View {
    HStack(spacing: 8) {
      PetArtwork(state: state, size: 46)

      VStack(alignment: .leading, spacing: 1) {
        Text(label)
          .font(.caption2)
          .foregroundStyle(.white.opacity(0.62))

        Text(state.shortName)
          .font(.caption)
          .fontWeight(.bold)
          .foregroundStyle(.white)
          .lineLimit(1)
      }
    }
  }
}

@available(iOSApplicationExtension 16.1, *)
private struct PetOrbitView: View {
  let state: PetActivityAttributes.ContentState

  private var poseLabel: String {
    guard let value = state.petPoseLabel, !value.isEmpty else {
      return "Trang phục hiện tại"
    }

    return value
  }

  private var poseKey: String {
    guard let value = state.petPoseKey, !value.isEmpty else {
      return "A1"
    }

    return value
  }

  var body: some View {
    ZStack(alignment: .topLeading) {
      RoundedRectangle(cornerRadius: 18, style: .continuous)
        .fill(PetDynamicIslandColor.surface.opacity(0.72))
        .overlay {
          RoundedRectangle(cornerRadius: 18, style: .continuous)
            .stroke(
              LinearGradient(
                colors: [
                  PetDynamicIslandColor.from(hex: state.elementColorHex),
                  .white.opacity(0.72),
                  PetDynamicIslandColor.from(hex: state.elementColorHex).opacity(0.55),
                ],
                startPoint: .leading,
                endPoint: .trailing
              ),
              lineWidth: 1.4
            )
        }
        .frame(height: 52)
        .padding(.top, 16)
        .overlay(alignment: .leading) {
          OrbitSpark(size: 7)
            .offset(x: 76, y: 2)
        }
        .overlay(alignment: .trailing) {
          OrbitSpark(size: 5)
            .offset(x: -30, y: 18)
        }

      HStack(spacing: 8) {
        VStack(alignment: .leading, spacing: 1) {
          Text(poseLabel)
            .font(.caption2)
            .foregroundStyle(.white.opacity(0.72))

          Text(state.skinName)
            .font(.subheadline)
            .fontWeight(.bold)
            .foregroundStyle(.white)
            .lineLimit(1)
        }

        Spacer(minLength: 4)

        Text(poseKey.uppercased())
          .font(.caption2)
          .fontWeight(.semibold)
          .foregroundStyle(PetDynamicIslandColor.from(hex: state.elementColorHex))
      }
      .padding(.leading, 68)
      .padding(.trailing, 16)
      .padding(.vertical, 7)
      .padding(.top, 16)

      PetArtwork(state: state, size: 60, showsOrb: false)
        .offset(x: 4, y: -1)
        .shadow(color: PetDynamicIslandColor.from(hex: state.elementColorHex).opacity(0.65), radius: 8, x: 0, y: 2)
        .zIndex(2)
    }
    .frame(maxWidth: .infinity, minHeight: 72)
  }
}

@available(iOSApplicationExtension 16.1, *)
private struct PetArtwork: View {
  let state: PetActivityAttributes.ContentState
  let size: CGFloat
  var showsOrb = true

  private var resolvedAssetName: String? {
    if let assetName = state.petAssetName, !assetName.isEmpty {
      return assetName
    }

    if let assetName = state.petBaseAssetName, !assetName.isEmpty {
      return assetName
    }

    return Self.assetNames[state.skinName]
  }

  private var animatedAssetName: String? {
    guard let resolvedAssetName else {
      return nil
    }

    guard let requestedFrameIndex = state.animationFrameIndex else {
      return resolvedAssetName
    }

    let frameIndex = ((requestedFrameIndex % Self.frameCount) + Self.frameCount) % Self.frameCount
    let frameAssetName = "\(resolvedAssetName)Frame\(frameIndex)"

    if UIImage(named: frameAssetName) != nil {
      return frameAssetName
    }

    return resolvedAssetName
  }

  private var poseScale: CGFloat {
    switch state.stageIndex ?? 0 {
    case 1:
      return 0.94
    case 2:
      return 1.08
    case 5:
      return 1.04
    default:
      return 1.0
    }
  }

  private var poseRotation: Angle {
    switch state.stageIndex ?? 0 {
    case 1:
      return .degrees(-7)
    case 2:
      return .degrees(5)
    case 4:
      return .degrees(-4)
    default:
      return .degrees(0)
    }
  }

  var body: some View {
    artwork(assetName: animatedAssetName, identity: imageIdentity)
  }

  private var imageIdentity: String {
    "\(animatedAssetName ?? state.zodiacSymbol)-\(state.animationFrameIndex ?? -1)"
  }

  private func artwork(assetName: String?, identity: String) -> some View {
    ZStack {
      if showsOrb {
        Circle()
          .fill(
            RadialGradient(
              colors: [
                .white.opacity(0.24),
                PetDynamicIslandColor.from(hex: state.elementColorHex).opacity(0.42),
                PetDynamicIslandColor.surface,
              ],
              center: .topLeading,
              startRadius: 1,
              endRadius: size
            )
          )

        Circle()
          .stroke(.white.opacity(0.42), lineWidth: 1)
      }

      if let assetName, let image = UIImage(named: assetName) {
        Image(uiImage: image)
          .resizable()
          .renderingMode(.original)
          .scaledToFit()
          .padding(showsOrb ? size * 0.04 : 0)
          .id(identity)
      } else {
        Text(state.zodiacSymbol)
          .font(.system(size: size * 0.44, weight: .bold))
          .foregroundStyle(.white)
          .id(identity)
      }
    }
    .frame(width: size, height: size)
    .scaleEffect(poseScale)
    .rotationEffect(poseRotation)
  }

  private static let frameCount = 8

  private static let assetNames = [
    "Aquarius ♒": "PetAquarius",
    "Aries ♈": "PetAries",
    "Cancer ♋": "PetCancer",
    "Capricorn ♑": "PetCapricorn",
    "Gemini ♊": "PetGemini",
    "Leo ♌": "PetLeo",
    "Libra ♎": "PetLibra",
    "Pisces ♓": "PetPisces",
    "Sagittarius ♐": "PetSagittarius",
    "Scorpio ♏": "PetScorpio",
    "Taurus ♉": "PetTaurus",
    "Virgo ♍": "PetVirgo",
  ]
}

private struct OrbitSpark: View {
  let size: CGFloat

  var body: some View {
    Image(systemName: "sparkle")
      .font(.system(size: size, weight: .bold))
      .foregroundStyle(.white)
      .shadow(color: .white.opacity(0.9), radius: 4)
  }
}

private enum PetDynamicIslandColor {
  static let surface = Color(red: 12 / 255, green: 10 / 255, blue: 28 / 255)

  static func from(hex: String) -> Color {
    let cleaned = hex.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
    guard cleaned.count == 6, let value = Int(cleaned, radix: 16) else {
      return Color(red: 124 / 255, green: 58 / 255, blue: 237 / 255)
    }

    let red = Double((value >> 16) & 0xFF) / 255
    let green = Double((value >> 8) & 0xFF) / 255
    let blue = Double(value & 0xFF) / 255
    return Color(red: red, green: green, blue: blue)
  }
}
