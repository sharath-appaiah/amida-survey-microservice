'use strict';

// valid US zip codes
const exampleZips = {
    20001: ['20001', '21001', '23002', '22003', '20010', '20020', '20030'],
    20002: ['20002', '23001', '24002', '23003', '21010', '20030', '20050'],
    20003: ['20003', '24001', '25002', '24003', '24010', '20030', '20050'],
    20004: ['20004', '28001', '28002', '25003', '27010', '20040', '20030'],
    20005: ['20005', '29001', '29002', '24003', '28010', '21040', '21030'],
};

const getSampleData = function getSampleData(generator, index) {
    const possibleZips = Object.keys(exampleZips);
    const zip = possibleZips[(index || 0) % possibleZips.length];
    const vicinity = exampleZips[zip];
    const apiResponse = {
        zip_codes: vicinity.map(generator.newZipCodeApiObject.bind(generator)),
    };
    return { zip, vicinity, apiResponse };
};

module.exports = {
    exampleZips,
    getSampleData,
};