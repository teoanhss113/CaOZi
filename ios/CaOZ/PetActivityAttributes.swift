import ActivityKit
import Foundation

@available(iOS 16.1, *)
struct PetActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var skinName: String
    var shortName: String
    var zodiacSymbol: String
    var elementName: String
    var elementColorHex: String
    var petAssetName: String?
    var petBaseAssetName: String?
    var petPoseKey: String?
    var petPoseLabel: String?
    var stageIndex: Int?
    var animationFrameIndex: Int?
    var updatedAt: Double
  }

  var title: String
}
