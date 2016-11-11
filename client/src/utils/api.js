import request from 'superagent'
import { push } from 'react-router-redux'

var apiUrl = 'http://localhost:9005/api/v1.0';

const apiProvider = store => next => action => {
  next(action);
  switch (action.type) {
    case 'GET_USER':
      request
        .get(apiUrl + '/users/me')
        .set("Authorization", "Bearer " + store.getState().get('loggedIn'))
        .send({})
        .end((error, response) => {
          if (error) {
            return next({
              type: 'GET_USER_ERROR',
              payload: error
            })
          }
          next({
            type: 'GET_USER_SUCCESS',
            payload: response.body
          })
        });
      break;
    case 'LOGOUT':
      store.dispatch(push('/'));
      break;
    case 'LOGIN':
      request
        .get(apiUrl + '/auth/basic')
        .auth(action.payload.username, action.payload.password)
        .end((error, response) => {
          if (!error) {
            next({
              type: 'LOGIN_SUCCESS',
              data: response.body
            });
            next({
              type: 'GET_USER'
            });
            store.dispatch(push('/profile'))
          } else {
            return next({
              type: 'LOGIN_ERROR',
              error
            })
          }
        });
      break;
    case 'ADD_USER':
      request
        .post(apiUrl + '/users')
        .send(action.user)
        .end((error, response) => {
          if (!error) {
            next({
              type: 'ADD_USER_SUCCESS',
              data: response.body
            })
          } else {
            return next({
              type: 'ADD_USER_ERROR',
              error
            })
          }
        });
      break;
    case 'GET_ETHNICITIES':
      request
        .get(apiUrl + '/ethnicities')
        .end((error, response) => {
          if (!error) {
            next({
              type: 'GET_ETHNICITIES_SUCCESS',
              payload: response.body
            })
          } else {
            next({type: 'GET_ETHNICITIES_ERROR'})
          }
        });
      break;
    case 'GET_SURVEY':
      request
        .get(apiUrl + '/profile-survey/')
        .end((error, response) => {
          if (!error) {
            next({
              type: 'GET_SURVEY_SUCCESS',
              payload: response.body
            })
          } else {
            next({type:'GET_SURVEY_ERROR'})
          }
        })
      break;
    case 'GET_PROFILE':
      request
        .get(apiUrl + '/profiles')
        .set("Authorization", "Bearer " + store.getState().get('loggedIn'))
        .end((error, response) => {
          if (!error) {
            next({
              type: 'GET_PROFILE_SUCCESS',
              payload: response.body
            })
          } else {
            next({type:'GET_PROFILE_ERROR'})
          }
        });
      break;
    case 'SAVE_PROFILE':
      request
        .patch(apiUrl + '/users/me')
        .send(store.getState().getIn(['profile', 'userUpdated']))
        .set("Authorization", "Bearer " + store.getState().get('loggedIn'))
        .end((error) => {
          if (!error) {
            next({
              type: 'SAVE_PROFILE_SUCCESS'
            })
          } else {
            next({type:'SAVE_PROFILE_ERROR'})
          }
        });
      break;
    case 'REGISTER':
      request
        .post(apiUrl + '/profiles')
        .send(action.payload)
        .end((error, response) => {
          if (!error) {
            next({
              type: 'LOGIN_SUCCESS',
              data: response.body
            });
            store.dispatch({type: 'GET_USER'}) //We used to send them to profile.
          }
        });
      break;
    case 'SAVE_SURVEY':
      request
        .post(apiUrl + '/surveys')
        .set("Authorization", "Bearer " + store.getState().get('loggedIn'))
        .send(action.payload.toJS())
        .end((error) => {
          if (!error) {
            next({
              type: 'SAVE_SURVEY_SUCCESS'
            })
          } else {
            next({
              type: 'SAVE_SURVEY_ERROR'
            })
          }
        });
      break;
    case 'GET_SURVEY_BY_ID':
      request
        .get(apiUrl + '/surveys/' + action.payload)
        .set("Authorization", "Bearer " + store.getState().get('loggedIn'))
        .end((error, response) => {
          if (!error) {
            next({
              type: 'GET_SURVEY_BY_ID_SUCCESS',
              payload: response.body
            })
          } else {
            next({type:'GET_SURVEY_BY_ID_ERROR'})
          }
        });
      break;
    case 'GET_ALL_SURVEYS':
      request
        .get(apiUrl + '/surveys')
        .set("Authorization", "Bearer " + store.getState().get('loggedIn'))
        .end((error, response) => {
          if (!error) {
            next({
              type: 'GET_ALL_SURVEYS_SUCCESS',
              payload: response.body
            })
          } else {
            next({type:'GET_ALL_SURVEYS_ERROR'})
          }
        });
      break;
    case 'SUBMIT_SURVEY':
      request
        .post(apiUrl + '/answers')
        .set("Authorization", "Bearer " + store.getState().get('loggedIn'))
        .send(action.payload.toJS())
        .end((error, response) => {
          if(!error) {
            next({
              type: 'SUBMIT_SURVEY_SUCCESS',
              payload: response.body
            })
          } else {
            next({type:'SUBMIT_SURVEY_FAILURE'})
          }
        });
      break;
    default:
      break
  }

};

export default apiProvider
