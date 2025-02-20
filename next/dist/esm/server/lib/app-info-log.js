import { loadEnvConfig } from '@next/env';
import * as Log from '../../build/output/log';
import { bold, purple } from '../../lib/picocolors';
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from '../../shared/lib/constants';
import loadConfig, { getEnabledExperimentalFeatures } from '../config';
export function logStartInfo({ networkUrl, appUrl, envInfo, expFeatureInfo, maxExperimentalFeatures = Infinity }) {
    Log.bootstrap(`${bold(purple(`${Log.prefixes.ready} Next.js ${"15.1.7"}`))}${process.env.TURBOPACK ? ' (Turbopack)' : ''}`);
    if (appUrl) {
        Log.bootstrap(`- Local:        ${appUrl}`);
    }
    if (networkUrl) {
        Log.bootstrap(`- Network:      ${networkUrl}`);
    }
    if (envInfo == null ? void 0 : envInfo.length) Log.bootstrap(`- Environments: ${envInfo.join(', ')}`);
    if (expFeatureInfo == null ? void 0 : expFeatureInfo.length) {
        Log.bootstrap(`- Experiments (use with caution):`);
        // only show a maximum number of flags
        for (const exp of expFeatureInfo.slice(0, maxExperimentalFeatures)){
            Log.bootstrap(`  · ${exp}`);
        }
        /* indicate if there are more than the maximum shown no. flags */ if (expFeatureInfo.length > maxExperimentalFeatures) {
            Log.bootstrap(`  · ...`);
        }
    }
    // New line after the bootstrap info
    Log.info('');
}
export async function getStartServerInfo(dir, dev) {
    let expFeatureInfo = [];
    await loadConfig(dev ? PHASE_DEVELOPMENT_SERVER : PHASE_PRODUCTION_BUILD, dir, {
        onLoadUserConfig (userConfig) {
            const userNextConfigExperimental = getEnabledExperimentalFeatures(userConfig.experimental);
            expFeatureInfo = userNextConfigExperimental.sort((a, b)=>a.length - b.length);
        }
    });
    // we need to reset env if we are going to create
    // the worker process with the esm loader so that the
    // initial env state is correct
    let envInfo = [];
    const { loadedEnvFiles } = loadEnvConfig(dir, true, console, false);
    if (loadedEnvFiles.length > 0) {
        envInfo = loadedEnvFiles.map((f)=>f.path);
    }
    return {
        envInfo,
        expFeatureInfo
    };
}

//# sourceMappingURL=app-info-log.js.map