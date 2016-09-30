import React, { Component } from 'react'
import Slider from 'react-slick'
import './index.scss';
import { Link } from 'react-router';
import '../../../node_modules/slick-carousel/slick/slick.scss'

class Form extends Component {
  constructor(props) {
    super(props)
    this.next = this.next.bind(this)
    this.previous = this.previous.bind(this)
  }
  next() {
    this.refs.slider.slickNext()
  }
  previous() {
    this.refs.slider.slickPrev()
  }
  render() {

    const renderInputField = (id, type, placeholder, label) => (
      <div key={id}>
        <div className="form-group">
          <label htmlFor={id}>{label}</label>
          <input required className="form-control" id={id} type={type} onChange={this.props.changeForm} />
        </div>
        <button className="form__submit-btn" onClick={this.next} type="button">Next</button>
      </div>
    )

    const renderSelectField = (id, defaultValue, label, options) => (
      <div key={id}>
        <div className="form-group">
          <label htmlFor="gender">{label}</label>
          <select required onChange={this.props.changeForm} value={defaultValue} className="form-control" id={id}>
            {options.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
        <button className="form__submit-btn" onClick={this.next} type="button">Next</button>
      </div>
    )

    const renderCheckbox = (surveyId, questionId, choiceId, label) => (
      <div className="checkbox" key={surveyId + '.' + questionId + '.' + choiceId}>
        <label><input type="checkbox"
                      name={surveyId + '.' + questionId + '.' + choiceId}
                      id={surveyId + '.' + questionId + '.' + choiceId}
                      onChange={this.props.changeChoice}
                      value={surveyId + '.' + questionId + '.' + choiceId}/> {label}</label>
      </div>
    )

    const renderChoices = (question) => {
      var checkboxes = question.choices.map(choice => {
        return renderCheckbox(this.props.survey.id, question.id, choice.id, choice.text);
      })

      var buttons

      if (question.actions) {
        buttons = question.actions.map((action, index) => {

          var self = this
          let boundItemClick = !action.type ? () => {
            this.props.onChoicesClear.bind(this, {
              questionId: question.id,
              surveyId: this.props.survey.id
            })()

            self.next()
          } : this.next

          return (
            <button className="form__submit-btn" onClick={boundItemClick}
                    key={question.id + "." + index}
                    type="button">{action.text}</button>
          )
        })
      } else {
        var self = this
        let boundItemClick = () => {
          this.props.onChoicesClear.bind(this, {
            questionId: question.id,
            surveyId: this.props.survey.id
          })()

          self.next()
        }

        buttons = (
          <div>
            <button className="form__submit-btn" onClick={this.next}
                    type="button">Next</button>
            <button className="form__submit-btn" onClick={boundItemClick}
                    type="button">Skip</button>
          </div>
        )
      }

      return (
        <div>
          <label>{question.text}</label>
          {checkboxes}
          {buttons}
        </div>
      )
    }

    const renderText = (data) => (
      <div>

      </div>
    )

    const renderBool = (question) => {

      var self = this

      let boundItemClickDefault = () => {
        this.props.changeBoolQuestion.bind(this, {
          questionId: question.id,
          surveyId: this.props.survey.id,
          choiceId: '-1'
        })()

        self.next()
      }

      var buttons = question.actions ?
        question.actions.map((action, index) => {

          let boundItemClick

          if (action.type) {
            boundItemClick = () => {
              this.props.changeBoolQuestion.bind(this, {
                questionId: question.id,
                surveyId: this.props.survey.id,
                choiceId: '-1'
              })()

              this.next()
            }
          } else {
            boundItemClick = () => {
              this.next()
            }
          }

          return (<button className="form__submit-btn" onClick={boundItemClick}  key={question.id + "." + index} type="button">{action.text}</button>)
        }) :
        [
          <button className="form__submit-btn" key={question.id + ".1"} type="button" onClick={boundItemClickDefault}>Yes</button>,
          <button className="form__submit-btn" key={question.id + ".2"} onClick={this.next} type="button">No</button>
        ]

      return (
        <div>
          <label>{question.text}</label>
          {buttons}
        </div>
      )
    }

    const renderSlide = (question) => {
      var content = '';

      switch(question.type) {
        case "choices":
          content = renderChoices(question)
          break
        case "text":
          content = renderText(question)
          break
        case "bool":
          content = renderBool(question)
          break
        default:
      }

      return (<div key={question.id}><div>{content}</div></div>)
    }

    var settings = {
      dots: false,
      infinite: false,
      speed: 500,
      slidesToShow: 1,
      slidesToScroll: 1,
      arrows: false,
      draggable: false,
      accessibility: false,
      useCSS: false
    }

    var slides = this.props.survey.questions.map(question => renderSlide(question))

    return(
      <form className="" onSubmit={this.props.onSubmit}>
        <div className="col-sm-6">
          <div className="registry-specific">
            {
              this.props.survey.questions.length > 0 ? (
                <Slider ref='slider' {...settings}>
                  {renderInputField("username", "text", "admin", "Username")}
                  {renderInputField("password", "password", "••••••••••", "Password")}
                  {renderInputField("email", "email", "someone@domain.tld", "Email")}
                  {renderInputField("zip", "text", "", "Zip")}
                  {renderInputField("dob", "date", "mm/dd/yyyy", "Date of birth")}
                  {renderSelectField("gender", this.props.data.gender, "Gender", this.props.availableGenders)}
                  {renderSelectField("ethnicity", this.props.data.ethnicity, "Ethnicity", this.props.availableEthnicities)}
                  {slides}
                  <div key="final">
                    <p>Thanks</p>
                    <p>Your account is created</p>
                    <Link to="/profile">Go to My Dashboard</Link>
                  </div>
                </Slider>
              ) : (<div>Loading...</div>)
            }
          </div>
        </div>

        <div className="form__submit-btn-wrapper">
          <button className="form__submit-btn" type="submit">{this.props.btnText}</button>
        </div>
      </form>
    );

  }
}

Form.propTypes = {
  onSubmit: React.PropTypes.func.isRequired,
  btnText: React.PropTypes.string.isRequired,
  changeForm: React.PropTypes.func.isRequired,
  data: React.PropTypes.object.isRequired,
  changeChoice: React.PropTypes.func.isRequired
}

export default Form;