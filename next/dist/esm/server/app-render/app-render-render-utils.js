import { InvariantError } from '../../shared/lib/invariant-error';
/**
 * This is a utility function to make scheduling sequential tasks that run back to back easier.
 * We schedule on the same queue (setImmediate) at the same time to ensure no other events can sneak in between.
 */ export function scheduleInSequentialTasks(render, followup) {
    if (process.env.NEXT_RUNTIME === 'edge') {
        throw new InvariantError('`scheduleInSequentialTasks` should not be called in edge runtime.');
    } else {
        return new Promise((resolve, reject)=>{
            let pendingResult;
            setImmediate(()=>{
                try {
                    pendingResult = render();
                } catch (err) {
                    reject(err);
                }
            });
            setImmediate(()=>{
                followup();
                resolve(pendingResult);
            });
        });
    }
}

//# sourceMappingURL=app-render-render-utils.js.map