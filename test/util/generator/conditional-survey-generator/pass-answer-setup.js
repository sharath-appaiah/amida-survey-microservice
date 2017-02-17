'use strict';

module.exports = [{ //enable when
    surveyIndex: 0,
    caseIndex: 0,
    questionIndex: 4,
    skipCondition: false,
    rulePath: '5.enableWhen.rule.answer',
    noAnswers: []
}, { //enable when
    surveyIndex: 1,
    caseIndex: 0,
    questionIndex: 4,
    skipCondition: false,
    rulePath: '5.enableWhen.rule.answer',
    noAnswers: []
}, { //enable when
    surveyIndex: 1,
    caseIndex: 1,
    questionIndex: 4,
    skipCondition: true,
    rulePath: '5.enableWhen.rule.answer',
    noAnswers: [5]
}, { //enable when
    surveyIndex: 2,
    caseIndex: 0,
    questionIndex: 2,
    skipCondition: false,
    rulePath: '3.enableWhen.rule.answer',
    noAnswers: [3]
}, { //enable when
    surveyIndex: 2,
    caseIndex: 1,
    questionIndex: 2,
    skipCondition: true,
    rulePath: '3.enableWhen.rule.answer',
    noAnswers: []
}, { // Skip equivalent
    surveyIndex: 3,
    caseIndex: 0,
    questionIndex: 3,
    noAnswers: [3, 4, 5, 6]
}, {
    surveyIndex: 3,
    caseIndex: 1,
    questionIndex: 3,
    skipCondition: false,
    rulePath: '3.section.enableWhen.rule.answer',
    noAnswers: [5]
}, {
    surveyIndex: 3,
    caseIndex: 2,
    questionIndex: 3,
    skipCondition: true,
    noAnswers: [4, 5, 6],
    rulePath: '3.section.enableWhen.rule.answer'
}, {
    surveyIndex: 4,
    caseIndex: 0,
    questionIndex: 5,
    noAnswers: [],
    skipCondition: true,
    rulePath: '5.section.enableWhen.rule.answer'
}, {
    surveyIndex: 4,
    caseIndex: 1,
    questionIndex: 5,
    noAnswers: [6],
    skipCondition: false,
    rulePath: '5.section.enableWhen.rule.answer'
}, {
    surveyIndex: 5,
    caseIndex: 0,
    questionIndex: 3,
    noAnswers: [4],
    skipCondition: true,
    rulePath: '3.section.enableWhen.rule.answer'
}, {
    surveyIndex: 5,
    caseIndex: 1,
    questionIndex: 3,
    skipCondition: false,
    noAnswers: [4, 5],
    rulePath: '3.section.enableWhen.rule.answer'
}, {
    surveyIndex: 6,
    caseIndex: 0,
    questionIndex: 0,
    noAnswers: [1]
}, {
    surveyIndex: 7,
    caseIndex: 0,
    questionIndex: 2,
    noAnswers: [2, 3, 4]
}, {
    surveyIndex: 7,
    caseIndex: 1,
    questionIndex: 2,
    noAnswers: [3]
}];
