#!/usr/bin/env node
/*
 * Adds the MarketelActivityWidget extension target to App.xcodeproj.
 *
 * This exists because the Swift for Live Activities was written but belonged to
 * no target, so it never compiled into anything. Xcode's UI is the usual way to
 * create a target; this does the same edit deterministically so it can happen
 * without a Mac and be reviewed as a diff.
 *
 * Object IDs are fixed rather than random, so re-running produces an identical
 * file and a second run is a no-op instead of a duplicate target.
 *
 * Usage: node scripts/add-widget-target.js [--check]
 *   --check  exit non-zero if the target is missing, change nothing
 */
const fs = require('fs');
const path = require('path');

const PROJECT = path.join(__dirname, '..', 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');

// Existing objects we attach to.
const APP_TARGET = '504EC3031FED79650016851F';
const PROJECT_OBJ = '504EC2FC1FED79650016851F';
const PRODUCTS_GROUP = '504EC3051FED79650016851F';
const MAIN_GROUP = '504EC2FB1FED79650016851F';
const APP_GROUP = '504EC3061FED79650016851F';
const APP_SOURCES_PHASE = '504EC3001FED79650016851F';

// New objects. The A11E0100.. block is unused by the existing file.
const ID = {
  widgetTarget: 'A11E01002E00000100000001',
  widgetProduct: 'A11E01012E00000100000001',
  widgetGroup: 'A11E01022E00000100000001',
  sharedGroup: 'A11E01032E00000100000001',
  widgetSources: 'A11E01042E00000100000001',
  widgetFrameworks: 'A11E01052E00000100000001',
  widgetResources: 'A11E01062E00000100000001',
  embedPhase: 'A11E01072E00000100000001',
  dependency: 'A11E01082E00000100000001',
  containerProxy: 'A11E01092E00000100000001',
  configList: 'A11E010A2E00000100000001',
  configDebug: 'A11E010B2E00000100000001',
  configRelease: 'A11E010C2E00000100000001',
  // File references
  refWidgetSwift: 'A11E010D2E00000100000001',
  refIntentsSwift: 'A11E010E2E00000100000001',
  refAttributesSwift: 'A11E010F2E00000100000001',
  refPluginSwift: 'A11E01102E00000100000001',
  refPluginObjC: 'A11E01112E00000100000001',
  refWidgetPlist: 'A11E01122E00000100000001',
  refWidgetEntitlements: 'A11E01132E00000100000001',
  // Build files
  bfWidgetSwift: 'A11E01142E00000100000001',
  bfIntentsSwift: 'A11E01152E00000100000001',
  bfAttributesWidget: 'A11E01162E00000100000001',
  bfAttributesApp: 'A11E01172E00000100000001',
  bfPluginSwift: 'A11E01182E00000100000001',
  bfPluginObjC: 'A11E01192E00000100000001',
  bfEmbedWidget: 'A11E011A2E00000100000001',
};

function insertBefore(src, marker, block) {
  const at = src.indexOf(marker);
  if (at === -1) throw new Error(`marker not found: ${marker}`);
  return src.slice(0, at) + block + src.slice(at);
}

function main() {
  let src = fs.readFileSync(PROJECT, 'utf8');
  const already = src.includes(ID.widgetTarget);

  if (process.argv.includes('--check')) {
    if (!already) {
      console.error('MarketelActivityWidget target is NOT present in the project.');
      process.exit(1);
    }
    console.log('MarketelActivityWidget target is present.');
    return;
  }
  if (already) {
    console.log('Widget target already present — nothing to do.');
    return;
  }

  /* ---- PBXBuildFile ---- */
  src = insertBefore(src, '/* End PBXBuildFile section */', [
    `\t\t${ID.bfWidgetSwift} /* MarketelActivityWidget.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ID.refWidgetSwift} /* MarketelActivityWidget.swift */; };`,
    `\t\t${ID.bfIntentsSwift} /* BookingDecisionIntents.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ID.refIntentsSwift} /* BookingDecisionIntents.swift */; };`,
    `\t\t${ID.bfAttributesWidget} /* BookingDecisionAttributes.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ID.refAttributesSwift} /* BookingDecisionAttributes.swift */; };`,
    `\t\t${ID.bfAttributesApp} /* BookingDecisionAttributes.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ID.refAttributesSwift} /* BookingDecisionAttributes.swift */; };`,
    `\t\t${ID.bfPluginSwift} /* LiveActivityPlugin.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ID.refPluginSwift} /* LiveActivityPlugin.swift */; };`,
    `\t\t${ID.bfPluginObjC} /* LiveActivityPlugin.m in Sources */ = {isa = PBXBuildFile; fileRef = ${ID.refPluginObjC} /* LiveActivityPlugin.m */; };`,
    `\t\t${ID.bfEmbedWidget} /* MarketelActivityWidgetExtension.appex in Embed Foundation Extensions */ = {isa = PBXBuildFile; fileRef = ${ID.widgetProduct} /* MarketelActivityWidgetExtension.appex */; settings = {ATTRIBUTES = (RemoveHeadersOnCopy, ); }; };`,
    '',
  ].join('\n'));

  /* ---- PBXFileReference ---- */
  src = insertBefore(src, '/* End PBXFileReference section */', [
    `\t\t${ID.widgetProduct} /* MarketelActivityWidgetExtension.appex */ = {isa = PBXFileReference; explicitFileType = "wrapper.app-extension"; includeInIndex = 0; path = MarketelActivityWidgetExtension.appex; sourceTree = BUILT_PRODUCTS_DIR; };`,
    `\t\t${ID.refWidgetSwift} /* MarketelActivityWidget.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = MarketelActivityWidget.swift; sourceTree = "<group>"; };`,
    `\t\t${ID.refIntentsSwift} /* BookingDecisionIntents.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = BookingDecisionIntents.swift; sourceTree = "<group>"; };`,
    `\t\t${ID.refWidgetPlist} /* Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; };`,
    `\t\t${ID.refWidgetEntitlements} /* MarketelActivityWidget.entitlements */ = {isa = PBXFileReference; lastKnownFileType = text.plist.entitlements; path = MarketelActivityWidget.entitlements; sourceTree = "<group>"; };`,
    `\t\t${ID.refAttributesSwift} /* BookingDecisionAttributes.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = BookingDecisionAttributes.swift; sourceTree = "<group>"; };`,
    `\t\t${ID.refPluginSwift} /* LiveActivityPlugin.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = LiveActivityPlugin.swift; sourceTree = "<group>"; };`,
    `\t\t${ID.refPluginObjC} /* LiveActivityPlugin.m */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.c.objc; path = LiveActivityPlugin.m; sourceTree = "<group>"; };`,
    '',
  ].join('\n'));

  /* ---- Widget frameworks phase (empty; WidgetKit/SwiftUI link implicitly) ---- */
  src = insertBefore(src, '/* End PBXFrameworksBuildPhase section */', [
    `\t\t${ID.widgetFrameworks} /* Frameworks */ = {`,
    '\t\t\tisa = PBXFrameworksBuildPhase;',
    '\t\t\tbuildActionMask = 2147483647;',
    '\t\t\tfiles = (',
    '\t\t\t);',
    '\t\t\trunOnlyForDeploymentPostprocessing = 0;',
    '\t\t};',
    '',
  ].join('\n'));

  /* ---- Groups ---- */
  src = insertBefore(src, '/* End PBXGroup section */', [
    `\t\t${ID.widgetGroup} /* MarketelActivityWidget */ = {`,
    '\t\t\tisa = PBXGroup;',
    '\t\t\tchildren = (',
    `\t\t\t\t${ID.refWidgetSwift} /* MarketelActivityWidget.swift */,`,
    `\t\t\t\t${ID.refIntentsSwift} /* BookingDecisionIntents.swift */,`,
    `\t\t\t\t${ID.refWidgetPlist} /* Info.plist */,`,
    `\t\t\t\t${ID.refWidgetEntitlements} /* MarketelActivityWidget.entitlements */,`,
    '\t\t\t);',
    '\t\t\tpath = MarketelActivityWidget;',
    '\t\t\tsourceTree = "<group>";',
    '\t\t};',
    `\t\t${ID.sharedGroup} /* Shared */ = {`,
    '\t\t\tisa = PBXGroup;',
    '\t\t\tchildren = (',
    `\t\t\t\t${ID.refAttributesSwift} /* BookingDecisionAttributes.swift */,`,
    '\t\t\t);',
    '\t\t\tpath = Shared;',
    '\t\t\tsourceTree = "<group>";',
    '\t\t};',
    '',
  ].join('\n'));

  // Register the new groups on the project root, and the plugin files in App.
  src = src.replace(
    `\t\t\t\t${APP_GROUP} /* App */,\n\t\t\t\t${PRODUCTS_GROUP} /* Products */,`,
    `\t\t\t\t${APP_GROUP} /* App */,\n\t\t\t\t${ID.widgetGroup} /* MarketelActivityWidget */,\n\t\t\t\t${ID.sharedGroup} /* Shared */,\n\t\t\t\t${PRODUCTS_GROUP} /* Products */,`
  );
  src = src.replace(
    `\t\t\t\t504EC3071FED79650016851F /* AppDelegate.swift */,`,
    `\t\t\t\t504EC3071FED79650016851F /* AppDelegate.swift */,\n\t\t\t\t${ID.refPluginSwift} /* LiveActivityPlugin.swift */,\n\t\t\t\t${ID.refPluginObjC} /* LiveActivityPlugin.m */,`
  );
  // Product goes in Products.
  src = src.replace(
    `\t\t\t\t504EC3041FED79650016851F /* App.app */,`,
    `\t\t\t\t504EC3041FED79650016851F /* App.app */,\n\t\t\t\t${ID.widgetProduct} /* MarketelActivityWidgetExtension.appex */,`
  );

  /* ---- Native target ---- */
  src = insertBefore(src, '/* End PBXNativeTarget section */', [
    `\t\t${ID.widgetTarget} /* MarketelActivityWidgetExtension */ = {`,
    '\t\t\tisa = PBXNativeTarget;',
    `\t\t\tbuildConfigurationList = ${ID.configList} /* Build configuration list for PBXNativeTarget "MarketelActivityWidgetExtension" */;`,
    '\t\t\tbuildPhases = (',
    `\t\t\t\t${ID.widgetSources} /* Sources */,`,
    `\t\t\t\t${ID.widgetFrameworks} /* Frameworks */,`,
    `\t\t\t\t${ID.widgetResources} /* Resources */,`,
    '\t\t\t);',
    '\t\t\tbuildRules = (',
    '\t\t\t);',
    '\t\t\tdependencies = (',
    '\t\t\t);',
    '\t\t\tname = MarketelActivityWidgetExtension;',
    '\t\t\tproductName = MarketelActivityWidgetExtension;',
    `\t\t\tproductReference = ${ID.widgetProduct} /* MarketelActivityWidgetExtension.appex */;`,
    '\t\t\tproductType = "com.apple.product-type.app-extension";',
    '\t\t};',
    '',
  ].join('\n'));

  // Embed phase + dependency on the App target.
  src = src.replace(
    `\t\t\t\t504EC3021FED79650016851F /* Resources */,\n\t\t\t);\n\t\t\tbuildRules = (`,
    `\t\t\t\t504EC3021FED79650016851F /* Resources */,\n\t\t\t\t${ID.embedPhase} /* Embed Foundation Extensions */,\n\t\t\t);\n\t\t\tbuildRules = (`
  );
  src = src.replace(
    `\t\t\tdependencies = (\n\t\t\t);\n\t\t\tname = App;`,
    `\t\t\tdependencies = (\n\t\t\t\t${ID.dependency} /* PBXTargetDependency */,\n\t\t\t);\n\t\t\tname = App;`
  );

  /* ---- Copy-files (embed) phase ---- */
  src = insertBefore(src, '/* Begin PBXFileReference section */', [
    '/* Begin PBXCopyFilesBuildPhase section */',
    `\t\t${ID.embedPhase} /* Embed Foundation Extensions */ = {`,
    '\t\t\tisa = PBXCopyFilesBuildPhase;',
    '\t\t\tbuildActionMask = 2147483647;',
    '\t\t\tdstPath = "";',
    '\t\t\tdstSubfolderSpec = 13;',
    '\t\t\tfiles = (',
    `\t\t\t\t${ID.bfEmbedWidget} /* MarketelActivityWidgetExtension.appex in Embed Foundation Extensions */,`,
    '\t\t\t);',
    '\t\t\tname = "Embed Foundation Extensions";',
    '\t\t\trunOnlyForDeploymentPostprocessing = 0;',
    '\t\t};',
    '/* End PBXCopyFilesBuildPhase section */',
    '',
    '',
  ].join('\n'));

  /* ---- Target dependency + container proxy ---- */
  src = insertBefore(src, '/* Begin PBXVariantGroup section */', [
    '/* Begin PBXContainerItemProxy section */',
    `\t\t${ID.containerProxy} /* PBXContainerItemProxy */ = {`,
    '\t\t\tisa = PBXContainerItemProxy;',
    `\t\t\tcontainerPortal = ${PROJECT_OBJ} /* Project object */;`,
    '\t\t\tproxyType = 1;',
    `\t\t\tremoteGlobalIDString = ${ID.widgetTarget};`,
    '\t\t\tremoteInfo = MarketelActivityWidgetExtension;',
    '\t\t};',
    '/* End PBXContainerItemProxy section */',
    '',
    '/* Begin PBXTargetDependency section */',
    `\t\t${ID.dependency} /* PBXTargetDependency */ = {`,
    '\t\t\tisa = PBXTargetDependency;',
    `\t\t\ttarget = ${ID.widgetTarget} /* MarketelActivityWidgetExtension */;`,
    `\t\t\ttargetProxy = ${ID.containerProxy} /* PBXContainerItemProxy */;`,
    '\t\t};',
    '/* End PBXTargetDependency section */',
    '',
    '',
  ].join('\n'));

  /* ---- Widget resources + sources phases ---- */
  src = insertBefore(src, '/* End PBXResourcesBuildPhase section */', [
    `\t\t${ID.widgetResources} /* Resources */ = {`,
    '\t\t\tisa = PBXResourcesBuildPhase;',
    '\t\t\tbuildActionMask = 2147483647;',
    '\t\t\tfiles = (',
    '\t\t\t);',
    '\t\t\trunOnlyForDeploymentPostprocessing = 0;',
    '\t\t};',
    '',
  ].join('\n'));

  src = insertBefore(src, '/* End PBXSourcesBuildPhase section */', [
    `\t\t${ID.widgetSources} /* Sources */ = {`,
    '\t\t\tisa = PBXSourcesBuildPhase;',
    '\t\t\tbuildActionMask = 2147483647;',
    '\t\t\tfiles = (',
    `\t\t\t\t${ID.bfWidgetSwift} /* MarketelActivityWidget.swift in Sources */,`,
    `\t\t\t\t${ID.bfIntentsSwift} /* BookingDecisionIntents.swift in Sources */,`,
    `\t\t\t\t${ID.bfAttributesWidget} /* BookingDecisionAttributes.swift in Sources */,`,
    '\t\t\t);',
    '\t\t\trunOnlyForDeploymentPostprocessing = 0;',
    '\t\t};',
    '',
  ].join('\n'));

  // The app target compiles the plugin and the shared attributes too. Without
  // the .m, Capacitor cannot see the plugin at all: it discovers plugins
  // through the Objective-C runtime.
  src = src.replace(
    `\t\t\t\t504EC3081FED79650016851F /* AppDelegate.swift in Sources */,`,
    [
      `\t\t\t\t504EC3081FED79650016851F /* AppDelegate.swift in Sources */,`,
      `\t\t\t\t${ID.bfPluginSwift} /* LiveActivityPlugin.swift in Sources */,`,
      `\t\t\t\t${ID.bfPluginObjC} /* LiveActivityPlugin.m in Sources */,`,
      `\t\t\t\t${ID.bfAttributesApp} /* BookingDecisionAttributes.swift in Sources */,`,
    ].join('\n')
  );

  /* ---- Build configurations ---- */
  const shared = [
    '\t\t\t\tCLANG_ANALYZER_NONNULL = YES;',
    '\t\t\t\tCLANG_ENABLE_MODULES = YES;',
    '\t\t\t\tCLANG_ENABLE_OBJC_ARC = YES;',
    '\t\t\t\tCODE_SIGN_ENTITLEMENTS = MarketelActivityWidget/MarketelActivityWidget.entitlements;',
    '\t\t\t\tCODE_SIGN_STYLE = Automatic;',
    '\t\t\t\tCURRENT_PROJECT_VERSION = 38;',
    '\t\t\t\tGENERATE_INFOPLIST_FILE = NO;',
    '\t\t\t\tINFOPLIST_FILE = MarketelActivityWidget/Info.plist;',
    // Push-to-start needs 17.2. The app target stays on 15.0; only the widget
    // requires the newer floor, and an extension may sit above its host.
    '\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.2;',
    '\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (',
    '\t\t\t\t\t"$(inherited)",',
    '\t\t\t\t\t"@executable_path/Frameworks",',
    '\t\t\t\t\t"@executable_path/../../Frameworks",',
    '\t\t\t\t);',
    '\t\t\t\tMARKETING_VERSION = 3.26;',
    '\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = com.bookmarketel.frontdesk.MarketelActivityWidget;',
    '\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";',
    '\t\t\t\tSKIP_INSTALL = YES;',
    '\t\t\t\tSWIFT_EMIT_LOC_STRINGS = YES;',
    '\t\t\t\tSWIFT_VERSION = 5.0;',
    '\t\t\t\tTARGETED_DEVICE_FAMILY = 1;',
  ];
  src = insertBefore(src, '/* End XCBuildConfiguration section */', [
    `\t\t${ID.configDebug} /* Debug */ = {`,
    '\t\t\tisa = XCBuildConfiguration;',
    '\t\t\tbuildSettings = {',
    ...shared,
    '\t\t\t\tDEBUG_INFORMATION_FORMAT = dwarf;',
    '\t\t\t\tSWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;',
    '\t\t\t\tSWIFT_OPTIMIZATION_LEVEL = "-Onone";',
    '\t\t\t};',
    '\t\t\tname = Debug;',
    '\t\t};',
    `\t\t${ID.configRelease} /* Release */ = {`,
    '\t\t\tisa = XCBuildConfiguration;',
    '\t\t\tbuildSettings = {',
    ...shared,
    '\t\t\t\tDEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";',
    '\t\t\t\tSWIFT_COMPILATION_MODE = wholemodule;',
    '\t\t\t\tSWIFT_OPTIMIZATION_LEVEL = "-O";',
    '\t\t\t};',
    '\t\t\tname = Release;',
    '\t\t};',
    '',
  ].join('\n'));

  src = insertBefore(src, '/* End XCConfigurationList section */', [
    `\t\t${ID.configList} /* Build configuration list for PBXNativeTarget "MarketelActivityWidgetExtension" */ = {`,
    '\t\t\tisa = XCConfigurationList;',
    '\t\t\tbuildConfigurations = (',
    `\t\t\t\t${ID.configDebug} /* Debug */,`,
    `\t\t\t\t${ID.configRelease} /* Release */,`,
    '\t\t\t);',
    '\t\t\tdefaultConfigurationIsVisible = 0;',
    '\t\t\tdefaultConfigurationName = Release;',
    '\t\t};',
    '',
  ].join('\n'));

  /* ---- Register the target on the project ---- */
  src = src.replace(
    `\t\t\ttargets = (\n\t\t\t\t${APP_TARGET} /* App */,\n\t\t\t);`,
    `\t\t\ttargets = (\n\t\t\t\t${APP_TARGET} /* App */,\n\t\t\t\t${ID.widgetTarget} /* MarketelActivityWidgetExtension */,\n\t\t\t);`
  );
  src = src.replace(
    `\t\t\t\t\t\tProvisioningStyle = Automatic;\n\t\t\t\t\t\tSystemCapabilities = {`,
    `\t\t\t\t\t\tProvisioningStyle = Automatic;\n\t\t\t\t\t\tSystemCapabilities = {`
  );
  src = src.replace(
    `\t\t\t\t\t};\n\t\t\t\t};\n\t\t\t};\n\t\t\tbuildConfigurationList = 504EC2FF1FED79650016851F`,
    `\t\t\t\t\t};\n\t\t\t\t};\n\t\t\t\t${ID.widgetTarget} = {\n\t\t\t\t\tCreatedOnToolsVersion = 16.0;\n\t\t\t\t\tProvisioningStyle = Automatic;\n\t\t\t\t};\n\t\t\t};\n\t\t\tbuildConfigurationList = 504EC2FF1FED79650016851F`
  );

  fs.writeFileSync(PROJECT, src);
  console.log('Added MarketelActivityWidgetExtension target.');
}

main();
