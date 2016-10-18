'use strict';

const _ = require('lodash');

class ConsentCommon {
    constructor(hxConsent, history) {
        this.hxConsent = hxConsent;
        this.history = history;
    }

    formExpectedConsent(index, typeIndices, signatures) {
        const serverConsent = this.hxConsent.server(index);
        const expectedSections = typeIndices.map(typeIndex => {
            const consentDocument = _.cloneDeep(this.history.server(typeIndex));
            if (consentDocument === null) {
                return null;
            }
            const typeDetail = this.history.type(typeIndex);
            delete consentDocument.typeId;
            const section = Object.assign({}, typeDetail, consentDocument);
            if (signatures) {
                const sign = signatures[typeIndex];
                section.signature = Boolean(sign);
                if (sign) {
                    section.language = sign;
                }
            }
            return section;
        });
        let result = _.omit(serverConsent, 'typeIds');
        result.sections = expectedSections;
        return result;
    }

    formTranslatedExpectedConsent(index, typeIndices, signatures, language) {
        const serverConsent = this.hxConsent.server(index);
        const expectedSections = typeIndices.map(typeIndex => {
            const consentDocument = _.cloneDeep(this.history.translatedServer(typeIndex, language));
            if (consentDocument === null) {
                return null;
            }
            const typeDetail = this.history.translatedType(typeIndex, language);
            delete consentDocument.typeId;
            const section = Object.assign({}, typeDetail, consentDocument);
            if (signatures) {
                const sign = signatures[typeIndex];
                section.signature = Boolean(sign);
                if (sign) {
                    section.language = sign;
                }
            }
            return section;
        });
        let result = _.omit(serverConsent, 'typeIds');
        result.sections = expectedSections;
        return result;
    }
}

module.exports = ConsentCommon;