import ActivityKit
import Foundation
import React
import UIKit
import WidgetKit

@objc(CaOZLiveActivityModule)
class CaOZLiveActivityModule: NSObject {
  private static let widgetAppGroupIdentifier = "group.com.robotpet.manager"
  private static let widgetPayloadKey = "caOZPetWidgetPayloadJSON"
  private static let widgetKind = "CaOZPetHomeWidget"
  private static let animationFrameCount = 8
  private static let animationFrameIntervalNanoseconds: UInt64 = 280_000_000
  private static var animationTask: Task<Void, Never>?
  private static var animationDriverGeneration = 0
  private static var backgroundTaskIdentifier: UIBackgroundTaskIdentifier = .invalid
  private static var backgroundTaskGeneration = 0
  private static var observersInstalled = false
  private static var shouldKeepAnimationAlive = false
  private static var lastPayload: NSDictionary?

  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(startOrUpdate:resolver:rejecter:)
  func startOrUpdate(
    _ payload: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    Self.persistWidgetState(payload)

    guard #available(iOS 16.1, *) else {
      reject("unsupported_ios", "Live Activities require iOS 16.1 or newer.", nil)
      return
    }

    Self.installResumeObserversIfNeeded()

    Task {
      do {
        let state = Self.makeContentState(from: payload)
        Self.rememberPayload(payload)

        if let activity = Activity<PetActivityAttributes>.activities.first {
          if #available(iOS 16.2, *) {
            await activity.update(ActivityContent(state: state, staleDate: nil))
          } else {
            await activity.update(using: state)
          }
          Self.startAnimationDriver(for: activity, baseState: state)
          resolve(["status": "updated", "activityId": activity.id])
          return
        }

        let attributes = PetActivityAttributes(title: "CaOZi")
        let activity: Activity<PetActivityAttributes>

        if #available(iOS 16.2, *) {
          activity = try Activity.request(
            attributes: attributes,
            content: ActivityContent(state: state, staleDate: nil),
            pushType: nil
          )
        } else {
          activity = try Activity.request(
            attributes: attributes,
            contentState: state,
            pushType: nil
          )
        }

        Self.startAnimationDriver(for: activity, baseState: state)
        resolve(["status": "started", "activityId": activity.id])
      } catch {
        reject("live_activity_error", error.localizedDescription, error)
      }
    }
  }

  @objc(syncWidgetState:resolver:rejecter:)
  func syncWidgetState(
    _ payload: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    #if CAOZ_HOME_WIDGET
    Self.persistWidgetState(payload)
    resolve(["status": "synced"])
    #else
    resolve(["status": "skipped"])
    #endif
  }

  @objc(end:rejecter:)
  func end(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 16.1, *) else {
      resolve(["status": "unsupported"])
      return
    }

    Task {
      Self.shouldKeepAnimationAlive = false
      Self.lastPayload = nil
      Self.stopAnimationDriver()
      for activity in Activity<PetActivityAttributes>.activities {
        if #available(iOS 16.2, *) {
          await activity.end(nil, dismissalPolicy: .immediate)
        } else {
          await activity.end(dismissalPolicy: .immediate)
        }
      }
      resolve(["status": "ended"])
    }
  }

  @available(iOS 16.1, *)
  private static func makeContentState(from payload: NSDictionary) -> PetActivityAttributes.ContentState {
    PetActivityAttributes.ContentState(
      skinName: payload["skinName"] as? String ?? "Aries ♈",
      shortName: payload["shortName"] as? String ?? "Aries",
      zodiacSymbol: payload["zodiacSymbol"] as? String ?? "♈",
      elementName: payload["elementName"] as? String ?? "Lửa",
      elementColorHex: payload["elementColorHex"] as? String ?? "#8B5CF6",
      petAssetName: payload["petAssetName"] as? String,
      petBaseAssetName: payload["petBaseAssetName"] as? String,
      petPoseKey: payload["petPoseKey"] as? String,
      petPoseLabel: payload["petPoseLabel"] as? String,
      stageIndex: Self.intValue(payload["stageIndex"]),
      animationFrameIndex: Self.intValue(payload["animationFrameIndex"]),
      updatedAt: payload["updatedAt"] as? Double ?? Date().timeIntervalSince1970
    )
  }

  @available(iOS 16.1, *)
  private static func startAnimationDriver(
    for activity: Activity<PetActivityAttributes>,
    baseState: PetActivityAttributes.ContentState
  ) {
    animationTask?.cancel()
    animationDriverGeneration += 1
    let generation = animationDriverGeneration

    animationTask = Task.detached(priority: .background) {
      beginBackgroundTask(for: generation)

      var frameIndex = ((baseState.animationFrameIndex ?? 0) + 1) % animationFrameCount

      while !Task.isCancelled {
        var animatedState = baseState
        animatedState.animationFrameIndex = frameIndex
        animatedState.updatedAt = Date().timeIntervalSince1970

        if #available(iOS 16.2, *) {
          await activity.update(ActivityContent(state: animatedState, staleDate: nil))
        } else {
          await activity.update(using: animatedState)
        }

        frameIndex = (frameIndex + 1) % animationFrameCount

        do {
          try await Task.sleep(nanoseconds: animationFrameIntervalNanoseconds)
        } catch {
          break
        }
      }

      endBackgroundTaskIfNeeded(for: generation)
      markAnimationDriverStopped(for: generation)
    }
  }

  private static func stopAnimationDriver() {
    animationTask?.cancel()
    animationTask = nil
    endBackgroundTaskIfNeeded()
  }

  private static func rememberPayload(_ payload: NSDictionary) {
    shouldKeepAnimationAlive = true
    lastPayload = payload.copy() as? NSDictionary ?? payload
  }

  private static func persistWidgetState(_ payload: NSDictionary) {
    #if CAOZ_HOME_WIDGET
    let widgetPayload = NSMutableDictionary(dictionary: payload)
    widgetPayload["updatedAt"] = Date().timeIntervalSince1970

    guard JSONSerialization.isValidJSONObject(widgetPayload),
          let data = try? JSONSerialization.data(withJSONObject: widgetPayload, options: []),
          let json = String(data: data, encoding: .utf8)
    else {
      return
    }

    let sharedDefaults = UserDefaults(suiteName: widgetAppGroupIdentifier)
    sharedDefaults?.set(json, forKey: widgetPayloadKey)
    sharedDefaults?.synchronize()

    UserDefaults.standard.set(json, forKey: widgetPayloadKey)
    UserDefaults.standard.synchronize()

    WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)
    #endif
  }

  private static func installResumeObserversIfNeeded() {
    DispatchQueue.main.async {
      guard !observersInstalled else {
        return
      }

      observersInstalled = true

      _ = NotificationCenter.default.addObserver(
        forName: UIApplication.didBecomeActiveNotification,
        object: nil,
        queue: .main
      ) { _ in
        scheduleAnimationResume(reason: "didBecomeActive", delay: 0.15)
      }

      _ = NotificationCenter.default.addObserver(
        forName: UIApplication.willEnterForegroundNotification,
        object: nil,
        queue: .main
      ) { _ in
        scheduleAnimationResume(reason: "willEnterForeground", delay: 0.25)
      }

      _ = NotificationCenter.default.addObserver(
        forName: UIScreen.capturedDidChangeNotification,
        object: nil,
        queue: .main
      ) { _ in
        scheduleAnimationResume(reason: "screenCaptureChanged", delay: 0.7)
      }
    }
  }

  private static func scheduleAnimationResume(reason: String, delay: TimeInterval) {
    DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
      resumeAnimationDriverIfPossible(reason: reason)
    }
  }

  private static func resumeAnimationDriverIfPossible(reason: String) {
    guard #available(iOS 16.1, *) else {
      return
    }

    guard shouldKeepAnimationAlive, let payload = lastPayload else {
      return
    }

    guard let activity = Activity<PetActivityAttributes>.activities.first else {
      return
    }

    let state = makeContentState(from: payload)
    print("CaOZLiveActivityModule: resume Dynamic Island animation after \(reason)")
    startAnimationDriver(for: activity, baseState: state)
  }

  private static func markAnimationDriverStopped(for generation: Int) {
    DispatchQueue.main.async {
      guard generation == animationDriverGeneration else {
        return
      }

      animationTask = nil
    }
  }

  private static func beginBackgroundTask(for generation: Int) {
    DispatchQueue.main.async {
      if backgroundTaskIdentifier != .invalid {
        UIApplication.shared.endBackgroundTask(backgroundTaskIdentifier)
        backgroundTaskIdentifier = .invalid
      }

      backgroundTaskGeneration = generation
      backgroundTaskIdentifier = UIApplication.shared.beginBackgroundTask(withName: "CaOZDynamicIslandAnimation") {
        guard generation == animationDriverGeneration else {
          return
        }

        animationTask?.cancel()
        endBackgroundTaskIfNeeded(for: generation)
      }
    }
  }

  private static func endBackgroundTaskIfNeeded(for generation: Int) {
    DispatchQueue.main.async {
      guard generation == backgroundTaskGeneration else {
        return
      }

      endBackgroundTaskIfNeeded()
    }
  }

  private static func endBackgroundTaskIfNeeded() {
    DispatchQueue.main.async {
      guard backgroundTaskIdentifier != .invalid else {
        return
      }

      UIApplication.shared.endBackgroundTask(backgroundTaskIdentifier)
      backgroundTaskIdentifier = .invalid
    }
  }

  private static func intValue(_ value: Any?) -> Int? {
    if let value = value as? Int {
      return value
    }

    if let value = value as? NSNumber {
      return value.intValue
    }

    if let value = value as? String {
      return Int(value)
    }

    return nil
  }
}
