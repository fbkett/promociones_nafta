import fs from 'node:fs';
import path from 'node:path';
import isNodeCoreModule from '@nolyfill/is-core-module';
import debug from 'debug';
import enhancedResolve from 'enhanced-resolve';
import { createPathsMatcher, getTsconfig } from 'get-tsconfig';
import { isBunModule } from 'is-bun-module';
import stableHashExports from 'stable-hash';
import { globSync, isDynamicPattern } from 'tinyglobby';
const stableHash = stableHashExports.default || stableHashExports;
const IMPORTER_NAME = 'eslint-import-resolver-typescript';
const log = debug(IMPORTER_NAME);
export const defaultConditionNames = [
    'types',
    'import',
    'esm2020',
    'es2020',
    'es2015',
    'require',
    'node',
    'node-addons',
    'browser',
    'default',
];
export const defaultExtensions = [
    '.ts',
    '.tsx',
    '.d.ts',
    '.js',
    '.jsx',
    '.json',
    '.node',
];
export const defaultExtensionAlias = {
    '.js': [
        '.ts',
        '.tsx',
        '.d.ts',
        '.js',
    ],
    '.jsx': ['.tsx', '.d.ts', '.jsx'],
    '.cjs': ['.cts', '.d.cts', '.cjs'],
    '.mjs': ['.mts', '.d.mts', '.mjs'],
};
export const defaultMainFields = [
    'types',
    'typings',
    'fesm2020',
    'fesm2015',
    'esm2020',
    'es2020',
    'module',
    'jsnext:main',
    'main',
];
export const interfaceVersion = 2;
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
export function resolve(source, file, options, resolver = null) {
    if (!cachedOptions ||
        previousOptionsHash !== (optionsHash = stableHash(options))) {
        previousOptionsHash = optionsHash;
        cachedOptions = {
            ...options,
            conditionNames: options?.conditionNames ?? defaultConditionNames,
            extensions: options?.extensions ?? defaultExtensions,
            extensionAlias: options?.extensionAlias ?? defaultExtensionAlias,
            mainFields: options?.mainFields ?? defaultMainFields,
            fileSystem: new enhancedResolve.CachedInputFileSystem(fileSystem, 5 * 1000),
            useSyncFileSystemCalls: true,
        };
    }
    if (!resolver) {
        if (!cachedResolver || resolverCachedOptions !== cachedOptions) {
            cachedResolver =
                enhancedResolve.ResolverFactory.createResolver(cachedOptions);
            resolverCachedOptions = cachedOptions;
        }
        resolver = cachedResolver;
    }
    log('looking for', source, 'in', file);
    source = removeQuerystring(source);
    if (isNodeCoreModule(source) ||
        isBunModule(source, (process.versions.bun ?? 'latest'))) {
        log('matched core:', source);
        return {
            found: true,
            path: null,
        };
    }
    initMappers(cachedOptions);
    const mappedPath = getMappedPath(source, file, cachedOptions.extensions, true);
    if (mappedPath) {
        log('matched ts path:', mappedPath);
    }
    let foundNodePath;
    try {
        foundNodePath =
            resolver.resolveSync({}, path.dirname(path.resolve(file)), mappedPath ?? source) || null;
    }
    catch {
        foundNodePath = null;
    }
    if ((JS_EXT_PATTERN.test(foundNodePath) ||
        (cachedOptions.alwaysTryTypes && !foundNodePath)) &&
        !/^@types[/\\]/.test(source) &&
        !path.isAbsolute(source) &&
        !source.startsWith('.')) {
        const definitelyTyped = resolve('@types' + path.sep + mangleScopedPackage(source), file, options);
        if (definitelyTyped.found) {
            return definitelyTyped;
        }
    }
    if (foundNodePath) {
        log('matched node path:', foundNodePath);
        return {
            found: true,
            path: foundNodePath,
        };
    }
    log("didn't find ", source);
    return {
        found: false,
    };
}
export function createTypeScriptImportResolver(options) {
    const resolver = enhancedResolve.ResolverFactory.createResolver({
        ...options,
        conditionNames: options?.conditionNames ?? defaultConditionNames,
        extensions: options?.extensions ?? defaultExtensions,
        extensionAlias: options?.extensionAlias ?? defaultExtensionAlias,
        mainFields: options?.mainFields ?? defaultMainFields,
        fileSystem: new enhancedResolve.CachedInputFileSystem(fileSystem, 5 * 1000),
        useSyncFileSystemCalls: true,
    });
    return {
        interfaceVersion: 3,
        name: IMPORTER_NAME,
        resolve(source, file) {
            return resolve(source, file, options, resolver);
        },
    };
}
function removeQuerystring(id) {
    const querystringIndex = id.lastIndexOf('?');
    if (querystringIndex >= 0) {
        return id.slice(0, querystringIndex);
    }
    return id;
}
const isFile = (path) => {
    try {
        return !!(path && fs.statSync(path, { throwIfNoEntry: false })?.isFile());
    }
    catch {
        return false;
    }
};
const isModule = (modulePath) => {
    return !!modulePath && isFile(path.resolve(modulePath, 'package.json'));
};
function getMappedPath(source, file, extensions = defaultExtensions, retry) {
    const originalExtensions = extensions;
    extensions = ['', ...extensions];
    let paths = [];
    if (RELATIVE_PATH_PATTERN.test(source)) {
        const resolved = path.resolve(path.dirname(file), source);
        if (isFile(resolved)) {
            paths = [resolved];
        }
    }
    else {
        paths = [
            ...new Set(mappers
                .filter(({ files }) => files.has(file))
                .map(({ mapperFn }) => mapperFn(source).map(item => [
                ...extensions.map(ext => `${item}${ext}`),
                ...originalExtensions.map(ext => `${item}/index${ext}`),
            ]))
                .flat(2)
                .map(toNativePathSeparator)),
        ].filter(mappedPath => {
            try {
                const stat = fs.statSync(mappedPath, { throwIfNoEntry: false });
                if (stat === undefined)
                    return false;
                if (stat.isFile())
                    return true;
                if (stat.isDirectory()) {
                    return isModule(mappedPath);
                }
            }
            catch {
                return false;
            }
            return false;
        });
    }
    if (retry && paths.length === 0) {
        const isJs = JS_EXT_PATTERN.test(source);
        if (isJs) {
            const jsExt = path.extname(source);
            const tsExt = jsExt.replace('js', 'ts');
            const basename = source.replace(JS_EXT_PATTERN, '');
            const resolved = getMappedPath(basename + tsExt, file) ||
                getMappedPath(basename + '.d' + (tsExt === '.tsx' ? '.ts' : tsExt), file);
            if (resolved) {
                return resolved;
            }
        }
        for (const ext of extensions) {
            const resolved = (isJs ? null : getMappedPath(source + ext, file)) ||
                getMappedPath(source + `/index${ext}`, file);
            if (resolved) {
                return resolved;
            }
        }
    }
    if (paths.length > 1) {
        log('found multiple matching ts paths:', paths);
    }
    return paths[0];
}
function initMappers(options) {
    if (mappers.length > 0 &&
        mappersCachedOptions === options &&
        prevCwd === process.cwd()) {
        return;
    }
    prevCwd = process.cwd();
    const configPaths = (typeof options.project === 'string'
        ? [options.project]
        : Array.isArray(options.project)
            ? options.project
            : [process.cwd()])
        .map(config => replacePathSeparator(config, path.sep, path.posix.sep));
    const defaultInclude = ['**/*'];
    const defaultIgnore = ['**/node_modules/**'];
    const projectPaths = [
        ...new Set([
            ...configPaths.filter(path => !isDynamicPattern(path)),
            ...globSync(configPaths.filter(path => isDynamicPattern(path)), {
                expandDirectories: false,
                ignore: defaultIgnore,
                absolute: true,
            }),
        ]),
    ];
    mappers = projectPaths
        .map(projectPath => {
        let tsconfigResult;
        if (isFile(projectPath)) {
            const { dir, base } = path.parse(projectPath);
            tsconfigResult = getTsconfig(dir, base);
        }
        else {
            tsconfigResult = getTsconfig(projectPath);
        }
        if (!tsconfigResult) {
            return undefined;
        }
        const mapperFn = createPathsMatcher(tsconfigResult);
        if (!mapperFn) {
            return undefined;
        }
        const files = tsconfigResult.config.files === undefined &&
            tsconfigResult.config.include === undefined
            ?
                globSync(defaultInclude, {
                    ignore: [
                        ...(tsconfigResult.config.exclude ?? []),
                        ...defaultIgnore,
                    ],
                    absolute: true,
                    cwd: path.dirname(tsconfigResult.path),
                })
            : [
                ...(tsconfigResult.config.files !== undefined &&
                    tsconfigResult.config.files.length > 0
                    ? tsconfigResult.config.files.map(file => path.normalize(path.resolve(path.dirname(tsconfigResult.path), file)))
                    : []),
                ...(tsconfigResult.config.include !== undefined &&
                    tsconfigResult.config.include.length > 0
                    ? globSync(tsconfigResult.config.include, {
                        ignore: [
                            ...(tsconfigResult.config.exclude ?? []),
                            ...defaultIgnore,
                        ],
                        absolute: true,
                        cwd: path.dirname(tsconfigResult.path),
                    })
                    : []),
            ];
        if (files.length === 0) {
            return undefined;
        }
        return {
            files: new Set(files.map(toNativePathSeparator)),
            mapperFn,
        };
    })
        .filter(isDefined);
    mappersCachedOptions = options;
}
function mangleScopedPackage(moduleName) {
    if (moduleName.startsWith('@')) {
        const replaceSlash = moduleName.replace(path.sep, '__');
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
    return replacePathSeparator(p, path[process.platform === 'win32' ? 'posix' : 'win32'].sep, path[process.platform === 'win32' ? 'win32' : 'posix'].sep);
}
function isDefined(value) {
    return value !== null && value !== undefined;
}
//# sourceMappingURL=index.js.map