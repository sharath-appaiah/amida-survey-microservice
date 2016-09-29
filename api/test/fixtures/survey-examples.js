'use strict';

exports.Example = {
    survey: {
        name: 'Example',
        released: true,
        questions: [{
            content: {
                text: 'Which sports do you like?',
                type: 'choices',
                selectable: false,
                choices: [
                    { text: 'Football' },
                    { text: 'Basketball' },
                    { text: 'Soccer' },
                    { text: 'Tennis' }
                ]
            }
        }, {
            content: {
                text: 'What is your hair color?',
                type: 'choice',
                selectable: false,
                choices: [
                    { text: 'Black' },
                    { text: 'Brown' },
                    { text: 'Blonde' },
                    { text: 'Other' }
                ]
            }
        }, {
            content: {
                text: 'Where were you born?',
                selectable: false,
                type: 'text'
            }
        }, {
            content: {
                text: 'Are you injured?',
                selectable: false,
                type: 'bool'
            }
        }, {
            content: {
                text: 'Do you have a cat?',
                selectable: true,
                type: 'bool'
            }
        }]
    },
    answer: [{
        choices: [{ index: 1 }, { index: 2 }]
    }, {
        choice: 0
    }, {
        textValue: 'Washington, DC'
    }, {
        boolValue: true
    }, {
        boolValue: false
    }],
    answerUpdate: [{
        choices: [{ index: 2 }, { index: 3 }]
    }, {
        choice: 2
    }, {
        textValue: 'Boston, MA'
    }, {
        boolValue: false
    }, {
        boolValue: true
    }]
};

exports.Alzheimer = {
    survey: {
        name: 'Alzheimer',
        released: true,
        questions: [{
            content: {
                text: 'Family history of memory disorders/AD/dementia?',
                selectable: false,
                type: 'bool'
            }
        }, {
            content: {
                text: 'How did you hear about us?',
                type: 'choices',
                selectable: true,
                choices: [
                    { text: 'TV' },
                    { text: 'Radio' },
                    { text: 'Newspaper' },
                    { text: 'Facebook/Google Ad/OtherInternet ad' },
                    { text: 'Physician/nurse/healthcare professional' },
                    { text: 'Caregiver' },
                    { text: 'Friend/Family member' },
                    { text: 'Community Event' },
                    { text: 'Other source', type: 'text' }
                ]
            }
        }, {
            content: {
                text: 'Are you interested in receiving email updates on any of the following?',
                type: 'choices',
                selectable: false,
                choices: [
                    { text: 'Brain Health' },
                    { text: 'Clinical Trials on Brain Health' }
                ],
                actions: [{
                    type: 'yes',
                    text: 'Subscribe'
                }, {
                    type: 'no',
                    text: 'I don\'t want to receive emails'
                }]
            }
        }, {
            content: {
                text: 'Are you interested in participating in clinical trials?',
                type: 'bool',
                selectable: false,
                actions: [{
                    type: 'yes',
                    text: 'Yes, I am interested'
                }, {
                    type: 'no',
                    text: 'I am not sure'
                }, {
                    type: 'no',
                    text: 'No, I just want to see what is out there.'
                }]
            }
        }]
    },
    answer: [{
        boolValue: true
    }, {
        choices: [{ index: 0 }, { index: 5 }, { index: 8, textValue: 'Internet' }]
    }, {
        choices: [{ index: 1 }]
    }, {
        boolValue: true
    }],
    answerUpdate: [{
        boolValue: true
    }, {
        choices: [{ index: 2 }, { index: 3 }, { index: 8, textValue: 'Metro Ad' }]
    }, {
        choices: [{ index: 0 }, { index: 1 }]
    }, {
        boolValue: false
    }]
};
