import SwiftUI
import WidgetKit

@main
struct CaOZDynamicIslandBundle: WidgetBundle {
  var body: some Widget {
    CaOZPetLiveActivity()
    // Keep the implementation for future development, but hide it from the gallery.
    #if CAOZ_HOME_WIDGET
    CaOZPetHomeWidget()
    #endif
  }
}
