import { SERVER_DIRECTORY } from '../../../../shared/lib/constants';
import { PrefixingNormalizer } from '../../prefixing-normalizer';
export class AppFilenameNormalizer extends PrefixingNormalizer {
    constructor(distDir){
        super(distDir, SERVER_DIRECTORY);
    }
    normalize(manifestFilename) {
        return super.normalize(manifestFilename);
    }
}

//# sourceMappingURL=app-filename-normalizer.js.map