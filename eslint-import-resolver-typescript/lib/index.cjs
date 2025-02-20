'use strict';

var fs = require('node:fs');
var path = require('node:path');
var isNodeCoreModule = require('@nolyfill/is-core-module');
var debug = require('debug');
var enhancedResolve = require('enhanced-resolve');
var getTsconfig = require('get-tsconfig');
var isBunModule = require('is-bun-module');
var stableHashExports = require('stable-hash');
var tinyglobby = require('tinyglobby');

var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
const stableHash = stableHashExports.default || stableHashExports;
const IMPORTER_NAME = "eslint-import-resolver-typescript";
const log = debug(IMPORTER_NAME);
const defaultConditionNames = [
  "types",
  "import",
  // APF: https://angular.io/guide/angular-package-format
  "esm2020",
  "es2020",
  "es2015",
  "require",
  "node",
  "node-addons",
  "browser",
  "default"
];
const defaultExtensions = [
  ".ts",
  ".tsx",
  ".d.ts",
  ".js",
  ".jsx",
  ".json",
  ".node"
];
const defaultExtensionAlias = {
  ".js": [
    ".ts",
    // `.tsx` can also be compiled as `.js`
    ".tsx",
    ".d.ts",
    ".js"
  ],
  ".jsx": [".tsx", ".d.ts", ".jsx"],
  ".cjs": [".cts", ".d.cts", ".cjs"],
  ".mjs": [".mts", ".d.mts", ".mjs"]
};
const defaultMainFields = [
  "types",
  "typings",
  // APF: https://angular.io/guide/angular-package-format
  "fesm2020",
  "fesm2015",
  "esm2020",
  "es2020",
  "module",
  "jsnext:main",
  "main"
];
const interfaceVersion = 2;
const fileSystem = fs;
const JS_EXT_PATTERN = /\.(?:[cm]js|jsx?)$/;
const RELATIVE_PATH_PATTERN = /^\.{1,2}(?:\/.*)?$/;
let previousOptionsHash;
let optionsHash;
let cachedOptions;
let prevCwd;
let mappersCachedOptions;
let mappers = [];
let resolverCachedOptions;
let cachedResolver;
function resolve(source, file, options, resolver = null) {
  var _a, _b, _c, _d, _e;
  if (!cachedOptions || previousOptionsHash !== (optionsHash = stableHash(options))) {
    previousOptionsHash = optionsHash;
    cachedOptions = __spreadProps(__spreadValues({}, options), {
      conditionNames: (_a = options == null ? void 0 : options.conditionNames) != null ? _a : defaultConditionNames,
      extensions: (_b = options == null ? void 0 : options.extensions) != null ? _b : defaultExtensions,
      extensionAlias: (_c = options == null ? void 0 : options.extensionAlias) != null ? _c : defaultExtensionAlias,
      mainFields: (_d = options == null ? void 0 : options.mainFields) != null ? _d : defaultMainFields,
      fileSystem: new enhancedResolve.CachedInputFileSystem(
        fileSystem,
        5 * 1e3
      ),
      useSyncFileSystemCalls: true
    });
  }
  if (!resolver) {
    if (!cachedResolver || resolverCachedOptions !== cachedOptions) {
      cachedResolver = enhancedResolve.ResolverFactory.createResolver(cachedOptions);
      resolverCachedOptions = cachedOptions;
    }
    resolver = cachedResolver;
  }
  log("looking for", source, "in", file);
  source = removeQuerystring(source);
  if (isNodeCoreModule(source) || isBunModule.isBunModule(source, (_e = process.versions.bun) != null ? _e : "latest")) {
    log("matched core:", source);
    return {
      found: true,
      path: null
    };
  }
  initMappers(cachedOptions);
  const mappedPath = getMappedPath(source, file, cachedOptions.extensions, true);
  if (mappedPath) {
    log("matched ts path:", mappedPath);
  }
  let foundNodePath;
  try {
    foundNodePath = resolver.resolveSync(
      {},
      path.dirname(path.resolve(file)),
      mappedPath != null ? mappedPath : source
    ) || null;
  } catch (e) {
    foundNodePath = null;
  }
  if ((JS_EXT_PATTERN.test(foundNodePath) || cachedOptions.alwaysTryTypes && !foundNodePath) && !/^@types[/\\]/.test(source) && !path.isAbsolute(source) && !source.startsWith(".")) {
    const definitelyTyped = resolve(
      "@types" + path.sep + mangleScopedPackage(source),
      file,
      options
    );
    if (definitelyTyped.found) {
      return definitelyTyped;
    }
  }
  if (foundNodePath) {
    log("matched node path:", foundNodePath);
    return {
      found: true,
      path: foundNodePath
    };
  }
  log("didn't find ", source);
  return {
    found: false
  };
}
function createTypeScriptImportResolver(options) {
  var _a, _b, _c, _d;
  const resolver = enhancedResolve.ResolverFactory.createResolver(__spreadProps(__spreadValues({}, options), {
    conditionNames: (_a = options == null ? void 0 : options.conditionNames) != null ? _a : defaultConditionNames,
    extensions: (_b = options == null ? void 0 : options.extensions) != null ? _b : defaultExtensions,
    extensionAlias: (_c = options == null ? void 0 : options.extensionAlias) != null ? _c : defaultExtensionAlias,
    mainFields: (_d = options == null ? void 0 : options.mainFields) != null ? _d : defaultMainFields,
    fileSystem: new enhancedResolve.CachedInputFileSystem(fileSystem, 5 * 1e3),
    useSyncFileSystemCalls: true
  }));
  return {
    interfaceVersion: 3,
    name: IMPORTER_NAME,
    resolve(source, file) {
      return resolve(source, file, options, resolver);
    }
  };
}
function removeQuerystring(id) {
  const querystringIndex = id.lastIndexOf("?");
  if (querystringIndex >= 0) {
    return id.slice(0, querystringIndex);
  }
  return id;
}
const isFile = (path2) => {
  var _a;
  try {
    return !!(path2 && ((_a = fs.statSync(path2, { throwIfNoEntry: false })) == null ? void 0 : _a.isFile()));
  } catch (e) {
    return false;
  }
};
const isModule = (modulePath) => {
  return !!modulePath && isFile(path.resolve(modulePath, "package.json"));
};
function getMappedPath(source, file, extensions = defaultExtensions, retry) {
  const originalExtensions = extensions;
  extensions = ["", ...extensions];
  let paths = [];
  if (RELATIVE_PATH_PATTERN.test(source)) {
    const resolved = path.resolve(path.dirname(file), source);
    if (isFile(resolved)) {
      paths = [resolved];
    }
  } else {
    paths = [
      ...new Set(
        mappers.filter(({ files }) => files.has(file)).map(
          ({ mapperFn }) => mapperFn(source).map((item) => [
            ...extensions.map((ext) => `${item}${ext}`),
            ...originalExtensions.map((ext) => `${item}/index${ext}`)
          ])
        ).flat(2).map(toNativePathSeparator)
      )
    ].filter((mappedPath) => {
      try {
        const stat = fs.statSync(mappedPath, { throwIfNoEntry: false });
        if (stat === void 0)
          return false;
        if (stat.isFile())
          return true;
        if (stat.isDirectory()) {
          return isModule(mappedPath);
        }
      } catch (e) {
        return false;
      }
      return false;
    });
  }
  if (retry && paths.length === 0) {
    const isJs = JS_EXT_PATTERN.test(source);
    if (isJs) {
      const jsExt = path.extname(source);
      const tsExt = jsExt.replace("js", "ts");
      const basename = source.replace(JS_EXT_PATTERN, "");
      const resolved = getMappedPath(basename + tsExt, file) || getMappedPath(
        basename + ".d" + (tsExt === ".tsx" ? ".ts" : tsExt),
        file
      );
      if (resolved) {
        return resolved;
      }
    }
    for (const ext of extensions) {
      const resolved = (isJs ? null : getMappedPath(source + ext, file)) || getMappedPath(source + `/index${ext}`, file);
      if (resolved) {
        return resolved;
      }
    }
  }
  if (paths.length > 1) {
    log("found multiple matching ts paths:", paths);
  }
  return paths[0];
}
function initMappers(options) {
  if (mappers.length > 0 && mappersCachedOptions === options && prevCwd === process.cwd()) {
    return;
  }
  prevCwd = process.cwd();
  const configPaths = (typeof options.project === "string" ? [options.project] : Array.isArray(options.project) ? options.project : [process.cwd()]).map((config) => replacePathSeparator(config, path.sep, path.posix.sep));
  const defaultInclude = ["**/*"];
  const defaultIgnore = ["**/node_modules/**"];
  const projectPaths = [
    .../* @__PURE__ */ new Set([
      ...configPaths.filter((path2) => !tinyglobby.isDynamicPattern(path2)),
      ...tinyglobby.globSync(
        configPaths.filter((path2) => tinyglobby.isDynamicPattern(path2)),
        {
          expandDirectories: false,
          ignore: defaultIgnore,
          absolute: true
        }
      )
    ])
  ];
  mappers = projectPaths.map((projectPath) => {
    var _a, _b;
    let tsconfigResult;
    if (isFile(projectPath)) {
      const { dir, base } = path.parse(projectPath);
      tsconfigResult = getTsconfig.getTsconfig(dir, base);
    } else {
      tsconfigResult = getTsconfig.getTsconfig(projectPath);
    }
    if (!tsconfigResult) {
      return void 0;
    }
    const mapperFn = getTsconfig.createPathsMatcher(tsconfigResult);
    if (!mapperFn) {
      return void 0;
    }
    const files = tsconfigResult.config.files === void 0 && tsconfigResult.config.include === void 0 ? (
      // Include everything if no files or include options
      tinyglobby.globSync(defaultInclude, {
        ignore: [
          ...(_a = tsconfigResult.config.exclude) != null ? _a : [],
          ...defaultIgnore
        ],
        absolute: true,
        cwd: path.dirname(tsconfigResult.path)
      })
    ) : [
      // https://www.typescriptlang.org/tsconfig/#files
      ...tsconfigResult.config.files !== void 0 && tsconfigResult.config.files.length > 0 ? tsconfigResult.config.files.map(
        (file) => path.normalize(
          path.resolve(path.dirname(tsconfigResult.path), file)
        )
      ) : [],
      // https://www.typescriptlang.org/tsconfig/#include
      ...tsconfigResult.config.include !== void 0 && tsconfigResult.config.include.length > 0 ? tinyglobby.globSync(tsconfigResult.config.include, {
        ignore: [
          ...(_b = tsconfigResult.config.exclude) != null ? _b : [],
          ...defaultIgnore
        ],
        absolute: true,
        cwd: path.dirname(tsconfigResult.path)
      }) : []
    ];
    if (files.length === 0) {
      return void 0;
    }
    return {
      files: new Set(files.map(toNativePathSeparator)),
      mapperFn
    };
  }).filter(isDefined);
  mappersCachedOptions = options;
}
function mangleScopedPackage(moduleName) {
  if (moduleName.startsWith("@")) {
    const replaceSlash = moduleName.replace(path.sep, "__");
    if (replaceSlash !== moduleName) {
      return replaceSlash.slice(1);
    }
  }
  return moduleName;
}
function replacePathSeparator(p, from, to) {
  return from === to ? p : p.replaceAll(from, to);
}
function toNativePathSeparator(p) {
  return replacePathSeparator(
    p,
    path[process.platform === "win32" ? "posix" : "win32"].sep,
    path[process.platform === "win32" ? "win32" : "posix"].sep
  );
}
function isDefined(value) {
  return value !== null && value !== void 0;
}

exports.createTypeScriptImportResolver = createTypeScriptImportResolver;
exports.defaultConditionNames = defaultConditionNames;
exports.defaultExtensionAlias = defaultExtensionAlias;
exports.defaultExtensions = defaultExtensions;
exports.defaultMainFields = defaultMainFields;
exports.interfaceVersion = interfaceVersion;
exports.resolve = resolve;
