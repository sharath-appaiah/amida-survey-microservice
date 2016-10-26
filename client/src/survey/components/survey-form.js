import React, { Component } from 'react';

export class SurveyInputField extends Component {
  render(){
    return(
      <div key={this.props.id} className="rr rr-question" >
        <label htmlFor={this.props.id}>{this.props.text}</label>
        <input autoComplete="off" required={this.props.required} className="rr-blankline rr-field"
          id={this.props.id} type={this.props.type} />
      </div>
    )
  }
}

//Truth be told, we could probably have a decision made within SurveyChoicesField
//instead of having bool be its own Component. That's a performance question.
export class SurveyBoolField extends Component {
  render(){
    return(
        <div id={this.props.id} className="rr">
          <label>{this.props.text}</label>
          <br />
          <label htmlFor={this.props.id}><input name={this.props.id} id={this.props.id+'t'}
            type="radio" value="true" required={this.props.required} />
          {this.props.vocab.get('YES')}</label>
          <br />
          <label htmlFor={this.props.id}><input name={this.props.id} id={this.props.id+'f'}
            type="radio" value="false"/> {this.props.vocab.get('NO')}</label>
        </div>
    )
  }
}

export class SurveyChoiceField extends Component {
  render(){
    return(
      <div key={this.props.id} className="rr rr-question" >
        <label htmlFor={this.props.id}>{this.props.text}</label>
        <select required={this.props.required} className="rr-blankline rr-field" id={this.props.id}>
          <option key={this.props.id+'x'}>{this.props.vocab.get('PLEASE_SELECT')}</option>
          {this.props.choices.map(choice => <option key={choice.id}
            value={choice.text}>{choice.text}</option>)}
        </select>
      </div>
    )
  }
}

export class SurveyChoicesField extends Component {
  constructor(props){
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }

  //This will have to be handled differently.
  handleChange(event) {
    document.getElementById(this.props.id+'textInput').className="invisible";
    this.props.choices.forEach(choice => {
      if(event.target.value == choice.text & choice.type =="text"){
        console.log(this.props.id);
        document.getElementById(this.props.id+'textInput').className="";
        return;
      }});
  }

  render(){
    return (
      <div key={this.props.id} className="rr">
        <label key={this.props.id} >{this.props.text}</label>
          <select required onChange={this.handleChange} className="rr-blankline rr-field"
            id={this.props.id}>{this.props.choices.map(choice => <option key={choice.id}
              value={choice.text} type={choice.type}>{choice.text}</option>)}
          </select>
          <div id={this.props.id+'textInput'} className="invisible">
            <label htmlFor={this.props.id+'text'}>{this.props.vocab.get('PLEASE_ENTER_DATA')}</label>
            <input name={this.props.id+'text'} autoComplete="off" className="rr-blankline rr-field"/>
          </div>
      </div>
    )
  }
}

const mapStateToProps = function(state) {

  return {
    vocab: state.getIn(['settings', 'language', 'vocabulary'])
  };
}

SurveyInputField.propTypes = {
}

//export SurveyInputField, SurveyChoiceField;
