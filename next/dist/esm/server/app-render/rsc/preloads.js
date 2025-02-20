/*

Files in the rsc directory are meant to be packaged as part of the RSC graph using next-app-loader.

*/ import ReactDOM from 'react-dom';
export function preloadStyle(href, crossOrigin, nonce) {
    const opts = {
        as: 'style'
    };
    if (typeof crossOrigin === 'string') {
        opts.crossOrigin = crossOrigin;
    }
    if (typeof nonce === 'string') {
        opts.nonce = nonce;
    }
    ReactDOM.preload(href, opts);
}
export function preloadFont(href, type, crossOrigin, nonce) {
    const opts = {
        as: 'font',
        type
    };
    if (typeof crossOrigin === 'string') {
        opts.crossOrigin = crossOrigin;
    }
    if (typeof nonce === 'string') {
        opts.nonce = nonce;
    }
    ReactDOM.preload(href, opts);
}
export function preconnect(href, crossOrigin, nonce) {
    const opts = {};
    if (typeof crossOrigin === 'string') {
        opts.crossOrigin = crossOrigin;
    }
    if (typeof nonce === 'string') {
        opts.nonce = nonce;
    }
    ;
    ReactDOM.preconnect(href, opts);
}

//# sourceMappingURL=preloads.js.map