'use strict';

const chai = require('chai');

const models = require('../../models');
const comparator = require('./comparator');

const expect = chai.expect;

const SpecTests = class SectionSpecTests {
    constructor(generator, hxSection) {
        this.generator = generator;
        this.hxSection = hxSection;
    }

    createSectionFn(section) {
        const generator = this.generator;
        const hxSection = this.hxSection;
        return function () {
            section = section || generator.newSection();
            return models.section.createSection(section)
                .then(({ id }) => hxSection.push(section, { id }));
        };
    }

    getSectionFn(index) {
        const hxSection = this.hxSection;
        return function () {
            index = (index === undefined) ? hxSection.lastIndex() : index;
            const id = hxSection.id(index);
            return models.section.getSection(id)
                .then((section) => {
                    hxSection.updateServer(index, section);
                    comparator.section(hxSection.client(index), section);
                });
        };
    }

    verifySectionFn(index) {
        const hxSection = this.hxSection;
        return function () {
            const server = hxSection.server(index);
            return models.section.getSection(server.id)
                .then((section) => {
                    expect(section).to.deep.equal(server);
                });
        };
    }

    deleteSectionFn(index) {
        const hxSection = this.hxSection;
        return function () {
            return models.section.deleteSection(hxSection.id(index))
                .then(() => {
                    hxSection.remove(index);
                });
        };
    }

    listSectionsFn() {
        const hxSection = this.hxSection;
        return function () {
            return models.section.listSections()
                .then((sections) => {
                    const expected = hxSection.listServers();
                    expect(sections).to.deep.equal(expected);
                });
        };
    }
};

const IntegrationTests = class SectionIntegrationTests {
    constructor(rrSuperTest, generator, hxSection) {
        this.rrSuperTest = rrSuperTest;
        this.generator = generator;
        this.hxSection = hxSection;
    }

    createSectionFn(section) {
        const generator = this.generator;
        const rrSuperTest = this.rrSuperTest;
        const hxSection = this.hxSection;
        return function () {
            section = section || generator.newSection();
            return rrSuperTest.post('/sections', section, 201)
                .expect((res) => {
                    hxSection.push(section, res.body);
                });
        };
    }

    getSectionFn(index) {
        const rrSuperTest = this.rrSuperTest;
        const hxSection = this.hxSection;
        return function () {
            index = (index === undefined) ? hxSection.lastIndex() : index;
            const id = hxSection.id(index);
            return rrSuperTest.get(`/sections/${id}`, true, 200)
                .expect((res) => {
                    hxSection.reloadServer(res.body);
                    comparator.section(hxSection.client(index), res.body);
                });
        };
    }

    deleteSectionFn(index) {
        const rrSuperTest = this.rrSuperTest;
        const hxSection = this.hxSection;
        return function () {
            const id = hxSection.id(index);
            return rrSuperTest.delete(`/sections/${id}`, 204)
                .expect(() => {
                    hxSection.remove(index);
                });
        };
    }

    listSectionsFn() {
        const rrSuperTest = this.rrSuperTest;
        const hxSection = this.hxSection;
        return function () {
            return rrSuperTest.get('/sections', true, 200)
                .expect((res) => {
                    const expected = hxSection.listServers();
                    expect(res.body).to.deep.equal(expected);
                });
        };
    }
};

module.exports = {
    SpecTests,
    IntegrationTests,
};
