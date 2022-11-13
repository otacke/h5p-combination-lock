import Util from '@services/util';
import Dictionary from '@services/dictionary';
import charRegex from 'char-regex';
import Lock from '@components/lock';
import '@styles/h5p-combination-lock.scss';

export default class CombinationLock extends H5P.Question {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super('combination-lock');

    // Sanitize parameters
    this.params = Util.extend({
      solution: 'H5P',
      alphabet: '',
      behaviour: {
        autoCheck: true,
        enableRetry: true,
        enableSolutionsButton: true
      },
      l10n: {
        check: 'Check',
        submit: 'Submit',
        showSolution: 'Show solution',
        retry: 'Retry',
        lockOpen: 'Lock open!',
        lockDisabled: 'No more attempts. Lock disabled.',
        attemptsLeft: 'Attempts left: @number',
        solutions: 'This combination opens the lock.',
        wrongCombination: 'This combination does not open the lock.',
        noMessage: '...'
      },
      a11y: {
        sample: 'Sample a11y'
      }
    }, params);   

    this.contentId = contentId;
    this.extras = extras;
    
    // Fill dictionary
    Dictionary.fill({ l10n: this.params.l10n, a11y: this.params.a11y });

    // Sanitize solution
    const symbols = this.params.solution.match(charRegex());
    if (!symbols || symbols?.length < 1) {
      this.params.solution = 'H5P';
    }
    
    // Sanitize alphabet
    this.params.alphabet = `${this.params.alphabet}${this.params.solution}`
      .match(charRegex()) // Ensure support for graphemes
      .reduce((sanitized, current) => {
        if (sanitized.indexOf(current) === -1) {
          sanitized = `${sanitized}${current}`;
        }
        return sanitized;
      }, '');

    // Ensure that there are at least 3 symbols for scrolling on wheel
    while (this.params.alphabet.match(charRegex()).length < 3) {
      this.params.alphabet = `${this.params.alphabet}${this.params.alphabet}`;
    }

    this.previousState = extras?.previousState || {};      

    const defaultLanguage = extras?.metadata?.defaultLanguage || 'en';
    this.languageTag = Util.formatLanguageCode(defaultLanguage);

    this.score = 0;
    this.wasAnswerGiven = this.previousState.wasAnswered || false;

    this.maxAttempts = this.params.behaviour.autoCheck ?
      Infinity :
      this.params.behaviour.maxAttempts || Infinity;

    this.attemptsLeft = this.previousState.attemptsLeft || this.maxAttempts;

    this.lock = new Lock(
      {
        alphabet: this.params.alphabet.match(charRegex()),
        solution: this.params.solution,
        autoCheck: this.params.behaviour.autoCheck,
        maxAttempts: this.maxAttempts,
        previousState: this.previousState.lock
      },
      {
        onChanged: () => {
          this.handleLockChanged();
        }
      }
    );

    if (!this.params.behaviour.autoCheck && this.maxAttempts !== Infinity) {
      this.lock.setMessage(Dictionary.get('l10n.attemptsLeft')
        .replace(/@number/g, this.attemptsLeft));
    }
    else {
      this.lock.setMessage(Dictionary.get('l10n.noMessage'));
    }

    this.dom = this.buildDOM();
  }

  /**
   * Register the DOM elements with H5P.Question.
   */
  registerDomElements() {
    // Register content
    this.setContent(this.dom);
  }

  /**
   * Build main DOM.
   *
   * @returns {HTMLElement} Main DOM.
   */
  buildDOM() {
    const dom = document.createElement('div');
    dom.classList.add('h5p-combination-lock-main');
    dom.appendChild(this.lock.getDOM());

    // Check answer button
    this.addButton(
      'check-answer',
      Dictionary.get('l10n.check'), () => {
        this.checkAnswer();
      },
      !this.params.behaviour.autoCheck,
      { 'aria-label': 'TODO' },
      { contentData: this.extras, textIfSubmitting: 'TODO' });
    
    // Show solution button
    this.addButton(
      'show-solution',
      Dictionary.get('l10n.showSolution'), () => {
        this.showSolutions({ showRetry: true });
      },
      this.params.behaviour.autoCheck &&
        this.params.behaviour.enableSolutionsButton,
      { 'aria-label': 'TODO' }
    );

    // Retry button
    this.addButton(
      'try-again',
      Dictionary.get('l10n.retry'), () => {
        this.resetTask();
      },
      false,
      { 'aria-label': 'TODO' }
    );  

    return dom;
  }

  /**
   * Get task title.
   *
   * @returns {string} Title.
   */
  getTitle() {
    // H5P Core function: createTitle
    return H5P.createTitle(
      this.extras?.metadata?.title || CombinationLock.DEFAULT_DESCRIPTION
    );
  }

  /**
   * Get description.
   *
   * @returns {string} Description.
   */
  getDescription() {
    return CombinationLock.DEFAULT_DESCRIPTION;
  }

  /**
   * Trigger xAPI event.
   *
   * @param {string} verb Short id of the verb we want to trigger.
   */
  triggerXAPIEvent(verb) {
    const xAPIEvent = this.createXAPIEvent(verb);
    this.trigger(xAPIEvent);
  }

  /**
   * Create an xAPI event.
   *
   * @param {string} verb Short id of the verb we want to trigger.
   * @returns {H5P.XAPIEvent} Event template.
   */
  createXAPIEvent(verb) {
    const xAPIEvent = this.createXAPIEventTemplate(verb);

    Util.extend(
      xAPIEvent.getVerifiedStatementValue(['object', 'definition']),
      this.getXAPIDefinition());

    if (verb === 'answered') {
      xAPIEvent.setScoredResult(
        this.getScore(),
        this.getMaxScore(),
        this,
        true,
        this.getScore() === this.getMaxScore()
      );

      xAPIEvent.data.statement.result = Util.extend(
        {
          response: this.lock.getResponse().match(charRegex()).join([','])
        },
        xAPIEvent.data.statement.result || {}
      );
    }

    return xAPIEvent;
  }

  /**
   * Get the xAPI definition for the xAPI object.
   *
   * @returns {object} XAPI definition.
   */
  getXAPIDefinition() {
    const definition = {};

    definition.name = {};
    definition.name[this.languageTag] = this.getTitle();
    // Fallback for h5p-php-reporting, expects en-US
    definition.name['en-US'] = definition.name[this.languageTag];

    definition.description = {};
    definition.description[this.languageTag] = Util
      .stripHTML(this.getDescription());
    // Fallback for h5p-php-reporting, expects en-US
    definition.description['en-US'] = definition.description[this.languageTag];

    definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
    definition.interactionType = 'fill-in';

    definition.correctResponsesPattern = [
      this.params.solution
        .match(charRegex())
        .join('[,]')
    ];

    return definition;
  }

  /**
   * Get current score.
   *
   * @returns {number} Current score.
   */
  getScore() {
    return this.score;
  }

  /**
   * Get maximum possible score.
   *
   * @returns {number} Maximum possible score.
   */
  getMaxScore() {
    return this.maxAttempts === Infinity ? 1 : this.maxAttempts;
  }

  /**
   * Determine whether the task was answered already.
   *
   * @returns {boolean} True if answer was given by user, else false.
   */
  getAnswerGiven() {
    return this.wasAnswerGiven;
  }

  /**
   * Get current state.
   *
   * @returns {object} Current state.
   */
  getCurrentState() {  
    return {
      wasAnswerGiven: this.wasAnswerGiven,
      attemptsLeft: this.attemptsLeft,
      lock: this.lock.getCurrentState()
    };
  }

  /**
   * Show solutions.
   *
   * @param {object} params Parameters.
   * @param {boolean} params.showRetry If true and valid, show retry button.
   */
  showSolutions(params = {}) {
    this.hideButton('show-solution');
    if (
      params.showRetry &&
      this.params.behaviour.autoCheck &&
      this.params.behaviour.enableRetry
    ) {
      this.showButton('try-again');
    }

    this.lock.disable();
    this.lock.setMessage(Dictionary.get('l10n.solutions'));
    this.lock.showSolutions();
  }

  /**
   * Reset task.
   */
  resetTask() {
    this.attemptsLeft = this.maxAttempts;
    this.score = 0;
    this.wasAnswerGiven = false;

    if (!this.params.behaviour.autoCheck && this.maxAttempts !== Infinity) {
      this.lock.setMessage(Dictionary.get('l10n.attemptsLeft')
        .replace(/@number/g, this.attemptsLeft));
    }
    else {
      this.lock.setMessage(Dictionary.get('l10n.noMessage'));
    }

    if (
      this.params.behaviour.autoCheck &&
      this.params.behaviour.enableSolutionsButton
    ) {
      this.showButton('show-solution');
    }
    else {
      this.hideButton('show-solution');
    }
    this.hideButton('try-again');
    if (!this.params.behaviour.autoCheck) {
      this.showButton('check-answer');
    }

    this.lock.reset();
  }

  /**
   * Check answer.
   */
  checkAnswer() {
    const response = this.lock.getResponse();
    if (response === this.params.solution) {
      this.lock.disable();
      this.score = this.maxAttempts === Infinity ? 1 : this.attemptsLeft;

      this.lock.setMessage(Dictionary.get('l10n.lockOpen'));

      this.triggerXAPIEvent('answered');
      this.hideButton('check-answer');

      if (this.params.behaviour.autoCheck) {
        this.hideButton('show-solution');
      }

      if (this.params.behaviour.enableRetry) {
        this.showButton('try-again');
      }

      return;
    }

    if (this.attemptsLeft === Infinity) {
      if (!this.params.behaviour.autoCheck) {
        this.lock.setMessage(Dictionary.get('l10n.wrongCombination'));  
      }

      return;
    }

    this.attemptsLeft--;

    if (this.attemptsLeft === 0) {
      this.lock.disable();

      this.lock.setMessage(Dictionary.get('l10n.lockDisabled'));

      this.score = 0;
      this.triggerXAPIEvent('answered');
      this.hideButton('check-answer');

      if (this.params.behaviour.enableSolutionsButton) {
        this.showButton('show-solution');
      }

      if (this.params.behaviour.enableRetry) {
        this.showButton('try-again');
      }    
    }
    else {
      if (!this.params.behaviour.autoCheck) {
        this.lock.setMessage(Dictionary.get('l10n.attemptsLeft')
          .replace(/@number/g, this.attemptsLeft));
      }      
    }
  }

  /**
   * Handle lock disabled.
   */
  handleLockChanged() {
    if (this.params.behaviour.autoCheck) {
      this.handleAnswerGiven();
      this.checkAnswer();
    }
  }

  /**
   * Handle lock was checked.
   */
  handleAnswerGiven() {
    this.wasAnswerGiven = true;
  }  
}

/** @constant {string} Default description */
CombinationLock.DEFAULT_DESCRIPTION = 'Boilerplate (SNORDIAN)';
