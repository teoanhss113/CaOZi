import AppIntents
import SwiftUI
import UIKit
import WidgetKit

private let caOZPetHomeWidgetKind = "CaOZPetHomeWidget"

struct CaOZPetHomeWidget: Widget {
  static let kind = caOZPetHomeWidgetKind

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: Self.kind, provider: PetWidgetProvider()) { entry in
      PetWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("CaOZi")
    .description("Hiển thị trang phục và trạng thái hiện tại của pet.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    .contentMarginsDisabled()
  }
}

private struct PetWidgetProvider: TimelineProvider {
  func placeholder(in context: Context) -> PetWidgetEntry {
    PetWidgetEntry(date: Date(), state: PetWidgetState.preview)
  }

  func getSnapshot(in context: Context, completion: @escaping (PetWidgetEntry) -> Void) {
    completion(PetWidgetEntry(date: Date(), state: PetWidgetStore.readState()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<PetWidgetEntry>) -> Void) {
    let entry = PetWidgetEntry(date: Date(), state: PetWidgetStore.readState())
    let refreshDate = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
    completion(Timeline(entries: [entry], policy: .after(refreshDate)))
  }
}

private struct PetWidgetEntry: TimelineEntry {
  let date: Date
  let state: PetWidgetState
}

private struct PetWidgetEntryView: View {
  @Environment(\.widgetFamily) private var family

  let entry: PetWidgetEntry

  var body: some View {
    Group {
      switch family {
      case .systemSmall:
        bubbleView(artworkScale: 0.76, controlSize: .compact)
      case .systemMedium:
        bubbleView(artworkScale: 0.7, controlSize: .regular)
      default:
        bubbleView(artworkScale: 0.68, controlSize: .regular)
      }
    }
    .petWidgetBackground(entry.state)
    .widgetURL(URL(string: "com.robotpet.manager://widget"))
  }

  fileprivate enum ControlSize {
    case compact
    case regular
  }

  private func bubbleView(artworkScale: CGFloat, controlSize: ControlSize) -> some View {
    GeometryReader { geometry in
      let side = min(geometry.size.width, geometry.size.height)
      let artworkSize = min(side * artworkScale, geometry.size.height * 0.82)

      ZStack {
        PetWidgetArtwork(state: entry.state, size: artworkSize)
          .frame(width: artworkSize + 12, height: artworkSize + 12)
          .layoutPriority(1)

        VStack {
          Spacer()
          HStack {
            Spacer()
            interactionButtons(controlSize: controlSize)
          }
        }
        .padding(controlSize == .compact ? 6 : 10)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
  }

  @ViewBuilder
  private func interactionButtons(controlSize: ControlSize) -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      HStack(spacing: controlSize == .compact ? 5 : 7) {
        PetWidgetActionButton(iconName: "hand.tap.fill", accessibilityLabel: "Vuốt ve pet", color: entry.state.tintColor, controlSize: controlSize, intent: PetWidgetPetIntent())
        PetWidgetActionButton(iconName: "sparkles", accessibilityLabel: "Chơi với pet", color: entry.state.tintColor, controlSize: controlSize, intent: PetWidgetPlayIntent())
        PetWidgetActionButton(iconName: "moon.zzz.fill", accessibilityLabel: "Cho pet nghỉ", color: entry.state.tintColor, controlSize: controlSize, intent: PetWidgetRestIntent())
      }
    }
  }
}

private struct PetWidgetArtwork: View {
  let state: PetWidgetState
  let size: CGFloat

  var body: some View {
    ZStack {
      if let assetName = state.resolvedAssetName, UIImage(named: assetName) != nil {
        Image(assetName)
          .resizable()
          .scaledToFit()
          .frame(width: size, height: size)
          .scaleEffect(state.poseScale)
          .rotationEffect(state.poseRotation)
          .shadow(color: state.tintColor.opacity(0.26), radius: 9, x: 0, y: 5)
      } else {
        Text(state.zodiacSymbol)
          .font(.system(size: size * 0.44, weight: .bold))
          .frame(width: size, height: size)
      }
    }
    .accessibilityLabel(Text("\(state.skinName), \(state.poseLabel)"))
  }
}

private struct PetWidgetBadge: View {
  let text: String
  let color: Color
  let isCompact: Bool

  var body: some View {
    Text(text)
      .font(.system(size: isCompact ? 10 : 11, weight: .bold))
      .fontWeight(.bold)
      .lineLimit(1)
      .minimumScaleFactor(0.72)
      .padding(.horizontal, isCompact ? 6 : 8)
      .padding(.vertical, isCompact ? 3 : 5)
      .foregroundStyle(.white)
      .background(color, in: Capsule())
  }

  init(text: String, color: Color, isCompact: Bool = false) {
    self.text = text
    self.color = color
    self.isCompact = isCompact
  }
}

@available(iOSApplicationExtension 17.0, *)
private struct PetWidgetActionButton<I: AppIntent>: View {
  let iconName: String
  let accessibilityLabel: String
  let color: Color
  let controlSize: PetWidgetEntryView.ControlSize
  let intent: I

  var body: some View {
    Button(intent: intent) {
      Image(systemName: iconName)
        .font(.system(size: controlSize == .compact ? 12 : 14, weight: .bold))
        .frame(width: controlSize == .compact ? 28 : 34, height: controlSize == .compact ? 28 : 34)
        .contentShape(Circle())
    }
    .buttonStyle(.plain)
    .foregroundStyle(color)
    .background(Color.white.opacity(0.16), in: Circle())
    .overlay {
      Circle()
        .stroke(color.opacity(0.26), lineWidth: 1)
    }
    .shadow(color: color.opacity(0.18), radius: 5, x: 0, y: 3)
    .accessibilityLabel(Text(accessibilityLabel))
  }
}

private struct PetWidgetState: Codable, Hashable {
  var skinName: String
  var shortName: String
  var zodiacSymbol: String
  var elementName: String
  var elementColorHex: String
  var petAssetName: String?
  var petBaseAssetName: String?
  var assetPrefix: String?
  var petPoseKey: String?
  var petPoseLabel: String?
  var stageIndex: Int?
  var stageCount: Int?
  var animationFrameIndex: Int?
  var widgetInteractionStep: Int?
  var updatedAt: Double

  static let preview = PetWidgetState(
    skinName: "Aries ♈",
    shortName: "Aries",
    zodiacSymbol: "♈",
    elementName: "Lửa",
    elementColorHex: "#F97316",
    petAssetName: "PetAriesA1",
    petBaseAssetName: "PetAries",
    assetPrefix: "PetAries",
    petPoseKey: "A1",
    petPoseLabel: "Đứng chờ",
    stageIndex: 0,
    stageCount: PetWidgetStore.stageCount,
    animationFrameIndex: 0,
    widgetInteractionStep: nil,
    updatedAt: Date().timeIntervalSince1970
  )

  var tintColor: Color {
    PetWidgetColor.from(hex: elementColorHex)
  }

  var poseKey: String {
    guard let petPoseKey, !petPoseKey.isEmpty else {
      return "A1"
    }

    return petPoseKey
  }

  var poseLabel: String {
    guard let petPoseLabel, !petPoseLabel.isEmpty else {
      return PetWidgetStore.definition(for: stageIndex ?? 0).label
    }

    return petPoseLabel
  }

  var resolvedAssetName: String? {
    if let petAssetName, !petAssetName.isEmpty {
      return frameAssetName(for: petAssetName) ?? petAssetName
    }

    if let petBaseAssetName, !petBaseAssetName.isEmpty {
      return frameAssetName(for: petBaseAssetName) ?? petBaseAssetName
    }

    return nil
  }

  var poseScale: CGFloat {
    switch normalizedStageIndex {
    case 1:
      return 0.94
    case 2:
      return 1.08
    case 5, 8, 9:
      return 1.04
    case 10:
      return 1.12
    default:
      return 1.0
    }
  }

  var poseRotation: Angle {
    switch normalizedStageIndex {
    case 1:
      return .degrees(-7)
    case 2:
      return .degrees(5)
    case 4:
      return .degrees(-4)
    case 10:
      return .degrees(7)
    default:
      return .degrees(0)
    }
  }

  private var normalizedStageIndex: Int {
    PetWidgetStore.normalizedStageIndex(stageIndex ?? 0)
  }

  private func frameAssetName(for assetName: String) -> String? {
    let frameIndex = ((animationFrameIndex ?? 0) % PetWidgetStore.frameCount + PetWidgetStore.frameCount) % PetWidgetStore.frameCount
    let candidate = "\(assetName)Frame\(frameIndex)"
    return UIImage(named: candidate) == nil ? nil : candidate
  }
}

private enum PetWidgetStore {
  static let appGroupIdentifier = "group.com.robotpet.manager"
  static let payloadKey = "caOZPetWidgetPayloadJSON"
  static let frameCount = 8

  fileprivate static let stageDefinitions: [(suffix: String, key: String, label: String)] = [
    ("A1", "A1", "Đứng chờ"),
    ("A2", "A2", "Bám góc"),
    ("A3", "A3", "Chạy quanh"),
    ("A4", "A4", "Tạo dáng"),
    ("A5", "A5", "Năng lượng"),
    ("A6", "A6", "Vui vẻ"),
    ("A7", "A7", "Nghỉ nhẹ"),
    ("State8s", "State8s", "8s"),
    ("StateHappy3", "StateHappy3", "Happy 3"),
    ("StateHappy4", "StateHappy4", "Happy 4"),
    ("StateNhay", "StateNhay", "Nhảy"),
  ]

  static var stageCount: Int {
    stageDefinitions.count
  }

  static func defaults() -> UserDefaults {
    UserDefaults(suiteName: appGroupIdentifier) ?? .standard
  }

  static func readState() -> PetWidgetState {
    guard
      let json = readPayloadJSON(),
      let data = json.data(using: .utf8),
      var state = try? JSONDecoder().decode(PetWidgetState.self, from: data)
    else {
      return .preview
    }

    normalize(&state)
    return state
  }

  @discardableResult
  static func advanceStage(by step: Int) -> PetWidgetState {
    var state = readState()
    let nextIndex = normalizedStageIndex((state.stageIndex ?? 0) + step)
    state.stageIndex = nextIndex
    state.stageCount = stageCount
    state.widgetInteractionStep = step
    state.animationFrameIndex = ((state.animationFrameIndex ?? 0) + step) % frameCount
    state.updatedAt = Date().timeIntervalSince1970
    applyStageDefinition(to: &state, stageIndex: nextIndex)
    save(state)
    return state
  }

  @discardableResult
  static func setStage(_ stageIndex: Int, interactionStep: Int) -> PetWidgetState {
    var state = readState()
    let nextIndex = normalizedStageIndex(stageIndex)
    state.stageIndex = nextIndex
    state.stageCount = stageCount
    state.widgetInteractionStep = interactionStep
    state.animationFrameIndex = ((state.animationFrameIndex ?? 0) + max(1, interactionStep)) % frameCount
    state.updatedAt = Date().timeIntervalSince1970
    applyStageDefinition(to: &state, stageIndex: nextIndex)
    save(state)
    return state
  }

  static func save(_ state: PetWidgetState) {
    guard let data = try? JSONEncoder().encode(state), let json = String(data: data, encoding: .utf8) else {
      return
    }

    defaults().set(json, forKey: payloadKey)
    defaults().synchronize()
  }

  static func definition(for stageIndex: Int) -> (suffix: String, key: String, label: String) {
    stageDefinitions[normalizedStageIndex(stageIndex)]
  }

  static func normalizedStageIndex(_ stageIndex: Int) -> Int {
    let count = max(1, stageDefinitions.count)
    return ((stageIndex % count) + count) % count
  }

  private static func readPayloadJSON() -> String? {
    if let sharedValue = UserDefaults(suiteName: appGroupIdentifier)?.string(forKey: payloadKey) {
      return sharedValue
    }

    return UserDefaults.standard.string(forKey: payloadKey)
  }

  private static func normalize(_ state: inout PetWidgetState) {
    let index = normalizedStageIndex(state.stageIndex ?? 0)
    state.stageIndex = index

    if state.stageCount == nil || state.stageCount == 0 {
      state.stageCount = stageCount
    }

    if state.petAssetName == nil || state.petAssetName?.isEmpty == true {
      applyStageDefinition(to: &state, stageIndex: index)
    }
  }

  private static func applyStageDefinition(to state: inout PetWidgetState, stageIndex: Int) {
    let definition = definition(for: stageIndex)
    let prefix = state.assetPrefix ?? state.petBaseAssetName ?? state.petAssetName ?? "PetAries"
    state.petAssetName = "\(prefix)\(definition.suffix)"
    state.petPoseKey = definition.key
    state.petPoseLabel = definition.label
  }
}

private enum PetWidgetColor {
  static func from(hex: String) -> Color {
    var value = hex.trimmingCharacters(in: .whitespacesAndNewlines)

    if value.hasPrefix("#") {
      value.removeFirst()
    }

    guard let intValue = UInt64(value, radix: 16) else {
      return Color(red: 0.55, green: 0.36, blue: 0.96)
    }

    let red = Double((intValue >> 16) & 0xFF) / 255.0
    let green = Double((intValue >> 8) & 0xFF) / 255.0
    let blue = Double(intValue & 0xFF) / 255.0

    return Color(red: red, green: green, blue: blue)
  }
}

private extension View {
  @ViewBuilder
  func petWidgetBackground(_ state: PetWidgetState) -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      self.containerBackground(for: .widget) {
        EmptyView()
      }
    } else {
      self.background(Color.clear)
    }
  }
}

@available(iOSApplicationExtension 17.0, *)
struct PetWidgetPetIntent: AppIntent {
  static var title: LocalizedStringResource = "Vuốt ve pet"

  func perform() async throws -> some IntentResult {
    PetWidgetStore.setStage(5, interactionStep: 1)
    WidgetCenter.shared.reloadTimelines(ofKind: caOZPetHomeWidgetKind)
    return .result()
  }
}

@available(iOSApplicationExtension 17.0, *)
struct PetWidgetPlayIntent: AppIntent {
  static var title: LocalizedStringResource = "Chơi với pet"

  func perform() async throws -> some IntentResult {
    PetWidgetStore.setStage(10, interactionStep: 2)
    WidgetCenter.shared.reloadTimelines(ofKind: caOZPetHomeWidgetKind)
    return .result()
  }
}

@available(iOSApplicationExtension 17.0, *)
struct PetWidgetRestIntent: AppIntent {
  static var title: LocalizedStringResource = "Cho pet nghỉ"

  func perform() async throws -> some IntentResult {
    PetWidgetStore.setStage(6, interactionStep: 3)
    WidgetCenter.shared.reloadTimelines(ofKind: caOZPetHomeWidgetKind)
    return .result()
  }
}
