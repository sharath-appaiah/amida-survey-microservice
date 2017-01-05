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
const SurveyIdentifierDAO = require('./survey-identifier.dao');

const consentType = new ConsentTypeDAO();
const consentDocument = new ConsentDocumentDAO({ consentType });
const consentSignature = new ConsentSignatureDAO();
const userConsentDocument = new UserConsentDocumentDAO({ consentDocument });
const user = new UserDAO({ consentDocument });
const auth = new AuthDAO();
const surveyConsent = new SurveyConsentDAO({ consentType });
const surveyConsentDocument = new SurveyConsentDocumentDAO({ surveyConsent, userConsentDocument });
const section = new SectionDAO();
const questionChoice = new QuestionChoiceDAO();
const questionAction = new QuestionActionDAO();
const question = new QuestionDAO({ questionChoice, questionAction });
const answer = new AnswerDAO({ surveyConsentDocument });
const survey = new SurveyDAO({ answer, section, question });
const userSurvey = new UserSurveyDAO({ survey, answer });
const consent = new ConsentDAO({ consentDocument });
const profileSurvey = new ProfileSurveyDAO({ survey, consentDocument, answer });
const profile = new ProfileDAO({ profileSurvey, survey, answer, user, consentSignature });
const language = new LanguageDAO();
const smtp = new SmtpDAO();
const assessment = new AssessmentDAO();
const userAssessment = new UserAssessmentDAO({ answer });
const questionIdentifier = new QuestionIdentifierDAO();
const answerIdentifier = new AnswerIdentifierDAO();
const surveyIdentifier = new SurveyIdentifierDAO();

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
    surveyIdentifier
};
