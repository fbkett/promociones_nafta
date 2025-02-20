import { yellow } from '../picocolors';
import spawn from 'next/dist/compiled/cross-spawn';
/**
 * Spawn a package manager installation with either npm, pnpm, or yarn.
 *
 * @returns A Promise that resolves once the installation is finished.
 */ export function install(root, dependencies, { packageManager, isOnline, devDependencies }) {
    let args = [];
    if (dependencies.length > 0) {
        if (packageManager === 'yarn') {
            args = [
                'add',
                '--exact'
            ];
            if (devDependencies) args.push('--dev');
        } else if (packageManager === 'pnpm') {
            args = [
                'add',
                '--save-exact'
            ];
            args.push(devDependencies ? '--save-dev' : '--save-prod');
        } else {
            // npm
            args = [
                'install',
                '--save-exact'
            ];
            args.push(devDependencies ? '--save-dev' : '--save');
        }
        args.push(...dependencies);
    } else {
        args = [
            'install'
        ] // npm, pnpm, and yarn all support `install`
        ;
        if (!isOnline) {
            args.push('--offline');
            console.log(yellow('You appear to be offline.'));
            if (packageManager !== 'npm') {
                console.log(yellow(`Falling back to the local ${packageManager} cache.`));
            }
            console.log();
        }
    }
    return new Promise((resolve, reject)=>{
        /**
     * Spawn the installation process.
     */ const child = spawn(packageManager, args, {
            cwd: root,
            stdio: 'inherit',
            env: {
                ...process.env,
                ADBLOCK: '1',
                // we set NODE_ENV to development as pnpm skips dev
                // dependencies when production
                NODE_ENV: 'development',
                DISABLE_OPENCOLLECTIVE: '1'
            }
        });
        child.on('close', (code)=>{
            if (code !== 0) {
                reject({
                    command: `${packageManager} ${args.join(' ')}`
                });
                return;
            }
            resolve();
        });
    });
}

//# sourceMappingURL=install.js.map