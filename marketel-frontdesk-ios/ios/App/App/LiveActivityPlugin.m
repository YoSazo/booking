#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Registration moved to Swift: LiveActivityPlugin now conforms to
// CAPBridgedPlugin (identifier / jsName / pluginMethods), which is how
// Capacitor 6+ discovers plugins. The old CAP_PLUGIN macro would re-declare the
// same bridging members and conflict, so it is intentionally left out here.
// This file stays in the target only to avoid editing the Xcode project.
