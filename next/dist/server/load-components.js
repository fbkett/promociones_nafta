"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    evalManifestWithRetries: null,
    loadComponents: null,
    loadManifestWithRetries: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    evalManifestWithRetries: function() {
        return evalManifestWithRetries;
    },
    loadComponents: function() {
        return loadComponents;
    },
    loadManifestWithRetries: function() {
        return loadManifestWithRetries;
    }
});
const _constants = require("../shared/lib/constants");
const _path = require("path");
const _require = require("./require");
const _interopdefault = require("../lib/interop-default");
const _tracer = require("./lib/trace/tracer");
const _constants1 = require("./lib/trace/constants");
const _loadmanifest = require("./load-manifest");
const _wait = require("../lib/wait");
const _encryptionutils = require("./app-render/encryption-utils");
const _actionutils = require("./app-render/action-utils");
const _ismetadataroute = require("../lib/metadata/is-metadata-route");
async function loadManifestWithRetries(manifestPath, attempts = 3) {
    while(true){
        try {
            return (0, _loadmanifest.loadManifest)(manifestPath);
        } catch (err) {
            attempts--;
            if (attempts <= 0) throw err;
            await (0, _wait.wait)(100);
        }
    }
}
async function evalManifestWithRetries(manifestPath, attempts = 3) {
    while(true){
        try {
            return (0, _loadmanifest.evalManifest)(manifestPath);
        } catch (err) {
            attempts--;
            if (attempts <= 0) throw err;
            await (0, _wait.wait)(100);
        }
    }
}
async function loadClientReferenceManifest(manifestPath, entryName, attempts) {
    try {
        const context = await evalManifestWithRetries(manifestPath, attempts);
        return context.__RSC_MANIFEST[entryName];
    } catch (err) {
        return undefined;
    }
}
async function loadComponentsImpl({ distDir, page, isAppPath, isDev }) {
    let DocumentMod = {};
    let AppMod = {};
    if (!isAppPath) {
        ;
        [DocumentMod, AppMod] = await Promise.all([
            (0, _require.requirePage)('/_document', distDir, false),
            (0, _require.requirePage)('/_app', distDir, false)
        ]);
    }
    // Make sure to avoid loading the manifest for metadata route handlers.
    const hasClientManifest = isAppPath && !(0, _ismetadataroute.isMetadataRoute)(page);
    // In dev mode we retry loading a manifest file to handle a race condition
    // that can occur while app and pages are compiling at the same time, and the
    // build-manifest is still being written to disk while an app path is
    // attempting to load.
    const manifestLoadAttempts = isDev ? 3 : 1;
    // Load the manifest files first
    const [buildManifest, reactLoadableManifest, dynamicCssManifest, clientReferenceManifest, serverActionsManifest] = await Promise.all([
        loadManifestWithRetries((0, _path.join)(distDir, _constants.BUILD_MANIFEST), manifestLoadAttempts),
        loadManifestWithRetries((0, _path.join)(distDir, _constants.REACT_LOADABLE_MANIFEST), manifestLoadAttempts),
        // This manifest will only exist in Pages dir && Production && Webpack.
        isAppPath || process.env.TURBOPACK ? undefined : loadManifestWithRetries((0, _path.join)(distDir, `${_constants.DYNAMIC_CSS_MANIFEST}.json`), manifestLoadAttempts).catch(()=>undefined),
        hasClientManifest ? loadClientReferenceManifest((0, _path.join)(distDir, 'server', 'app', page.replace(/%5F/g, '_') + '_' + _constants.CLIENT_REFERENCE_MANIFEST + '.js'), page.replace(/%5F/g, '_'), manifestLoadAttempts) : undefined,
        isAppPath ? loadManifestWithRetries((0, _path.join)(distDir, 'server', _constants.SERVER_REFERENCE_MANIFEST + '.json'), manifestLoadAttempts).catch(()=>null) : null
    ]);
    // Before requiring the actual page module, we have to set the reference
    // manifests to our global store so Server Action's encryption util can access
    // to them at the top level of the page module.
    if (serverActionsManifest && clientReferenceManifest) {
        (0, _encryptionutils.setReferenceManifestsSingleton)({
            page,
            clientReferenceManifest,
            serverActionsManifest,
            serverModuleMap: (0, _actionutils.createServerModuleMap)({
                serverActionsManifest
            })
        });
    }
    const ComponentMod = await (0, _require.requirePage)(page, distDir, isAppPath);
    const Component = (0, _interopdefault.interopDefault)(ComponentMod);
    const Document = (0, _interopdefault.interopDefault)(DocumentMod);
    const App = (0, _interopdefault.interopDefault)(AppMod);
    const { getServerSideProps, getStaticProps, getStaticPaths, routeModule } = ComponentMod;
    return {
        App,
        Document,
        Component,
        buildManifest,
        reactLoadableManifest,
        dynamicCssManifest,
        pageConfig: ComponentMod.config || {},
        ComponentMod,
        getServerSideProps,
        getStaticProps,
        getStaticPaths,
        clientReferenceManifest,
        serverActionsManifest,
        isAppPath,
        page,
        routeModule
    };
}
const loadComponents = (0, _tracer.getTracer)().wrap(_constants1.LoadComponentsSpan.loadComponents, loadComponentsImpl);

//# sourceMappingURL=load-components.js.map