/* global describe,before,it*/
'use strict';
process.env.NODE_ENV = 'test';

const chai = require('chai');

const config = require('../../config');

const SharedIntegration = require('../util/shared-integration');
const RRSuperTest = require('../util/rr-super-test');
const Generator = require('../util/entity-generator');
const History = require('../util/entity-history');
const consentSeed = require('../util/consent-seed');
const consentExample = require('../fixtures/example/consent-demo');

const expect = chai.expect;
const generator = new Generator();
const shared = new SharedIntegration(generator);

describe('consent demo', function () {
    const store = new RRSuperTest();
    const hxUser = new History();

    //*******
    // Sync and seed the database.  This is part of syncAndLoadAlzheimer.js script.  It creates the consent documents.
    // The document contents themselves are in test/fixtures/example/consent-demo.  Change the content however you wish.
    //******* START 1

    before(shared.setUpFn(store));

    it('create Terms of Use and Consent Form records', function () {
        return consentSeed(consentExample);
    });

    let termsOfUse;

    //****** END 1

    //******
    // Get Terms of Use before regustration.  The content will be in res.body.sections[0].content.  Show it to user
    //****** START 2

    it('get Terms of Use before registration', function (done) {
        store.get('/consents/name/terms-of-use/documents', false, 200)
            .expect(function (res) {
                const result = res.body;
                expect(result.name).to.equal('terms-of-use');
                termsOfUse = res.body;
                //console.log(res.body);
            })
            .end(done);

    });

    //****** END 2

    //******
    // At this point user is not created.  It will be created when registration is sent dowm.  Right now
    // marking the terms of use as signed only possible after user is created so on the client you will 
    // have to first get the results of registration (which will get you the authentication token) and send 
    // down the signatures.  User creation below simulates the registration.
    //****** START 3

    it('login as super', shared.loginFn(store, config.superUser));

    const user = generator.newUser();
    it('create a user', shared.createUserFn(store, hxUser, user));

    it('logout as super', shared.logoutFn(store));

    it('login as user', shared.loginFn(store, user));

    // This us the actual signing of the terms of use document

    it('sign the Terms of Use document', function (done) {
        store.post('/consent-signatures', { consentDocumentId: termsOfUse.sections[0].id }, 201)
            .expect(function () {})
            .end(done);
    });

    //****** END 3

    //******
    // Later you can always get the Terms of use and check if a new signature is needed.
    // New signature will be needed if a new Terms of Use document is posted (admin functionality, we can simulate from a script if needed).
    //****** START 4

    it('get the Terms of Use document with signature', function (done) {
        store.get('/consents/name/terms-of-use/user-documents', true, 200)
            .expect(function (res) {
                expect(res.body.name).to.equal('terms-of-use');
                expect(res.body.sections[0].signature).to.equal(true);
                //console.log(res.body);
            })
            .end(done);
    });

    //****** END 4

    let consents;

    //******
    // Get the Consent Form and check if it is signed.  Again the content is in res.body.sections[0].content
    // Here it has not been signed yet.
    //****** START 5

    it('get the Consents document', function (done) {
        store.get('/consents/name/consent/user-documents', true, 200)
            .expect(function (res) {
                consents = res.body;
                expect(res.body.name).to.equal('consent');
                expect(res.body.sections[0].signature).to.equal(false);
                //console.log(res.body);
            })
            .end(done);
    });

    //****** END 5

    //******
    // Sign the Consent Form.
    //****** START 6

    it('sign the Consents document', function (done) {
        store.post('/consent-signatures', { consentDocumentId: consents.sections[0].id }, 201)
            .expect(function () {})
            .end(done);
    });

    //****** END 6

    //******
    // Get the Consent Form and check if it is signed.\
    // Here it has now been signed yet.
    //****** START 7

    it('get the Consents document', function (done) {
        store.get('/consents/name/consent/user-documents', true, 200)
            .expect(function (res) {
                consents = res.body;
                expect(res.body.name).to.equal('consent');
                expect(res.body.sections[0].signature).to.equal(true);
                //console.log(res.body);
            })
            .end(done);
    });

    //****** END 7

    it('logout as user', shared.logoutFn(store));
});