// This file is only used in app router due to the specific error state handling.
import { getReactStitchedError } from '../components/react-dev-overlay/internal/helpers/stitched-error';
import { handleClientError } from '../components/react-dev-overlay/internal/helpers/use-error-handler';
import { isNextRouterError } from '../components/is-next-router-error';
import { isBailoutToCSRError } from '../../shared/lib/lazy-dynamic/bailout-to-csr';
import { reportGlobalError } from './report-global-error';
import { originConsoleError } from '../components/globals/intercept-console-error';
export const onCaughtError = (err, errorInfo)=>{
    // Skip certain custom errors which are not expected to be reported on client
    if (isBailoutToCSRError(err) || isNextRouterError(err)) return;
    if (process.env.NODE_ENV !== 'production') {
        var _errorInfo_errorBoundary, _errorInfo_componentStack;
        const errorBoundaryComponent = errorInfo == null ? void 0 : (_errorInfo_errorBoundary = errorInfo.errorBoundary) == null ? void 0 : _errorInfo_errorBoundary.constructor;
        const errorBoundaryName = (// read react component displayName
        errorBoundaryComponent == null ? void 0 : errorBoundaryComponent.displayName) || (errorBoundaryComponent == null ? void 0 : errorBoundaryComponent.name) || 'Unknown';
        const componentThatErroredFrame = errorInfo == null ? void 0 : (_errorInfo_componentStack = errorInfo.componentStack) == null ? void 0 : _errorInfo_componentStack.split('\n')[1];
        var // regex to match the function name in the stack trace
        // example 1: at Page (http://localhost:3000/_next/static/chunks/pages/index.js?ts=1631600000000:2:1)
        // example 2: Page@http://localhost:3000/_next/static/chunks/pages/index.js?ts=1631600000000:2:1
        _componentThatErroredFrame_match;
        // Match chrome or safari stack trace
        const matches = (_componentThatErroredFrame_match = componentThatErroredFrame == null ? void 0 : componentThatErroredFrame.match(/\s+at (\w+)\s+|(\w+)@/)) != null ? _componentThatErroredFrame_match : [];
        const componentThatErroredName = matches[1] || matches[2] || 'Unknown';
        // Create error location with errored component and error boundary, to match the behavior of default React onCaughtError handler.
        const errorBoundaryMessage = "It was handled by the <" + errorBoundaryName + "> error boundary.";
        const componentErrorMessage = componentThatErroredName ? "The above error occurred in the <" + componentThatErroredName + "> component." : "The above error occurred in one of your components.";
        const errorLocation = componentErrorMessage + " " + errorBoundaryMessage;
        const stitchedError = getReactStitchedError(err);
        // TODO: change to passing down errorInfo later
        // In development mode, pass along the component stack to the error
        if (errorInfo.componentStack) {
            ;
            stitchedError._componentStack = errorInfo.componentStack;
        }
        // Log and report the error with location but without modifying the error stack
        originConsoleError('%o\n\n%s', err, errorLocation);
        handleClientError(stitchedError, []);
    } else {
        originConsoleError(err);
    }
};
export const onUncaughtError = (err, errorInfo)=>{
    // Skip certain custom errors which are not expected to be reported on client
    if (isBailoutToCSRError(err) || isNextRouterError(err)) return;
    if (process.env.NODE_ENV !== 'production') {
        var _errorInfo_componentStack;
        const componentThatErroredFrame = errorInfo == null ? void 0 : (_errorInfo_componentStack = errorInfo.componentStack) == null ? void 0 : _errorInfo_componentStack.split('\n')[1];
        var _componentThatErroredFrame_match;
        // Match chrome or safari stack trace
        const matches = (_componentThatErroredFrame_match = componentThatErroredFrame == null ? void 0 : componentThatErroredFrame.match(/\s+at (\w+)\s+|(\w+)@/)) != null ? _componentThatErroredFrame_match : [];
        const componentThatErroredName = matches[1] || matches[2] || 'Unknown';
        // Create error location with errored component and error boundary, to match the behavior of default React onCaughtError handler.
        const errorLocation = componentThatErroredName ? "The above error occurred in the <" + componentThatErroredName + "> component." : "The above error occurred in one of your components.";
        const stitchedError = getReactStitchedError(err);
        // TODO: change to passing down errorInfo later
        // In development mode, pass along the component stack to the error
        if (errorInfo.componentStack) {
            ;
            stitchedError._componentStack = errorInfo.componentStack;
        }
        // Log and report the error with location but without modifying the error stack
        originConsoleError('%o\n\n%s', err, errorLocation);
        reportGlobalError(stitchedError);
    } else {
        reportGlobalError(err);
    }
};

//# sourceMappingURL=app-router.js.map