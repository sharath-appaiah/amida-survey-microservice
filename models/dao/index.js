'use strict';

const UserDAO = require('./user.dao');
const AuthDAO = require('./auth.dao');
const QuestionChoiceDAO = require('./question-choice.dao');
const QuestionActionDAO = require('./question-action.dao');
const QuestionDAO = require('./question.dao');
const AnswerDAO = require('./answer.dao');
const SurveyDAO = require('./survey.dao');
const ConsentTypeDAO = require('./consent-type.dao');
const ConsentDocumentDAO = require('./consent-document.dao');
const ConsentSignatureDAO = require('./consent-signature.dao');
const UserConsentDocumentDAO = require('./user-consent-document.dao');
const ConsentDAO = require('./consent.dao');
const SurveyQuestionDAO = require('./survey-question.dao');
const SurveyConsentDAO = require('./survey-consent.dao');
const SurveyConsentDocumentDAO = require('./survey-consent-document.dao');
const ProfileSurveyDAO = require('./profile-survey.dao');
const ProfileDAO = require('./profile.dao');
const LanguageDAO = require('./language.dao');
const SectionDAO = require('./section.dao');
const SmtpDAO = require('./smtp.dao');
const UserSurveyDAO = require('./user-survey.dao');
const AssessmentDAO = require('./assessment.dao');
const UserAssessmentDAO = require('./user-assessment.dao');
const QuestionIdentifierDAO = require('./question-identifier.dao');
const AnswerIdentifierDAO = require('./answer-identifier.dao');
const AnswerRuleDAO = require('./answer-rule.dao');
const SurveyIdentifierDAO = require('./survey-identifier.dao');
const EnumeralDAO = require('./enumeral.dao');
const EnumerationDAO = require('./enumeration.dao');

const questionIdentifier = new QuestionIdentifierDAO();
const answerIdentifier = new AnswerIdentifierDAO();
const surveyIdentifier = new SurveyIdentifierDAO();
const enumeral = new EnumeralDAO();
const enumeration = new EnumerationDAO({ enumeral });
const consentType = new ConsentTypeDAO();
const consentDocument = new ConsentDocumentDAO({ consentType });
const consentSignature = new ConsentSignatureDAO();
const userConsentDocument = new UserConsentDocumentDAO({ consentDocument });
const user = new UserDAO({ consentDocument });
const auth = new AuthDAO();
const surveyConsent = new SurveyConsentDAO({ consentType });
const surveyConsentDocument = new SurveyConsentDocumentDAO({ surveyConsent, userConsentDocument });
const section = new SectionDAO();
const questionChoice = new QuestionChoiceDAO({ enumeral, enumeration });
const questionAction = new QuestionActionDAO();
const question = new QuestionDAO({ questionChoice, questionAction, enumeral, enumeration, questionIdentifier, answerIdentifier });
const answerRule = new AnswerRuleDAO();
const surveyQuestion = new SurveyQuestionDAO();
const answer = new AnswerDAO({ surveyConsentDocument, surveyQuestion, answerRule });
const survey = new SurveyDAO({ answer, section, question, enumeral, surveyIdentifier, surveyQuestion });
const userSurvey = new UserSurveyDAO({ survey, answer });
const consent = new ConsentDAO({ consentDocument });
const profileSurvey = new ProfileSurveyDAO({ survey, consentDocument, answer });
const profile = new ProfileDAO({ profileSurvey, survey, answer, user, consentSignature });
const language = new LanguageDAO();
const smtp = new SmtpDAO();
const assessment = new AssessmentDAO();
const userAssessment = new UserAssessmentDAO({ answer });

module.exports = {
    user,
    auth,
    section,
    questionChoice,
    questionAction,
    question,
    answer,
    survey,
    userSurvey,
    consentType,
    consentDocument,
    consentSignature,
    userConsentDocument,
    consent,
    surveyConsent,
    surveyConsentDocument,
    profileSurvey,
    profile,
    language,
    smtp,
    assessment,
    userAssessment,
    questionIdentifier,
    answerIdentifier,
    surveyIdentifier,
    enumeral,
    enumeration,
    surveyQuestion,
    answerRule
};