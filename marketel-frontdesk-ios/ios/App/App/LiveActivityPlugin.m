#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Capacitor discovers plugins through the Objective-C runtime, so a Swift-only
// plugin is invisible without this macro block.
CAP_PLUGIN(LiveActivityPlugin, "LiveActivity",
    CAP_PLUGIN_METHOD(getCapabilities, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(setCredentials, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(clearCredentials, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(startObserving, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(endAll, CAPPluginReturnPromise);
)
