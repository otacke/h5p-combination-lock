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
        correctCombination: 'This combination opens the lock.',
        wrongCombination: 'This combination does not open the lock.',
        noMessage: '...'
      },
      a11y: {
        check: 'Check whether the combination opens the lock.',
        submit: 'Check whether the combination opens the lock and submit attempt to server.',
        showSolution: 'Show the solution. The correct symbols that will open the lock will be displayed.',
        retry: 'Retry the task. Reset all lock segments and start the task over again.',
        currentSymbol: 'Current symbol: @symbol',
        currentSymbols: 'Current symbols: @symbols',
        previousSymbol: 'Previous symbol',
        nextSymbol: 'Next symbol',
        correctCombination: 'This combination opens the lock. @combination.',
        wrongCombination: 'Wrong combination',
        disabled: 'disabled',
        combinationLock: 'combination lock',
        segment: 'Segment @number of @total'
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
    this.viewState = this.previousState.viewState ??
      CombinationLock.VIEW_STATES['task'];

    const defaultLanguage = extras?.metadata?.defaultLanguage || 'en';
    this.languageTag = Util.formatLanguageCode(defaultLanguage);

    this.score = 0;
    this.wasAnswerGiven = this.previousState.wasAnswerGiven ?? false;

    this.maxAttempts = this.params.behaviour.autoCheck ?
      Infinity :
      this.params.behaviour.maxAttempts ?? Infinity;

    this.attemptsLeft = this.previousState.attemptsLeft ?? this.maxAttempts;

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
        },
        onResized: () => {
          this.trigger('resize');
        }
      }
    );

    this.dom = this.buildDOM();

    if (this.viewState === CombinationLock.VIEW_STATES['task']) {
      if (!this.params.behaviour.autoCheck && this.maxAttempts !== Infinity) {
        const attemptsLeftText = Dictionary.get('l10n.attemptsLeft')
          .replace(/@number/g, this.attemptsLeft);
  
        const wrongCombinationText = Dictionary.get('a11y.wrongCombination');
  
        this.announceMessage({
          text: attemptsLeftText,
          aria: [wrongCombinationText, attemptsLeftText].join('. ')
        });
      }
      else {
        this.announceMessage({
          text: Dictionary.get('l10n.noMessage'),
          aria: ''
        });
      }
    }
    else if (this.viewState === CombinationLock.VIEW_STATES['results']) {
      this.checkAnswer({ skipXAPI: true });
    }
    else if (this.viewState === CombinationLock.VIEW_STATES['solutions']) {
      this.showSolutions({ showRetry: true });
    }
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
      Dictionary.get('l10n.check'),
      () => {
        this.checkAnswer();
      },
      !this.params.behaviour.autoCheck,
      { 'aria-label': Dictionary.get('a11y.check') },
      {
        contentData: this.extras,
        textIfSubmitting: Dictionary.get('l10n.submit')
      });
    
    // Show solution button
    this.addButton(
      'show-solution',
      Dictionary.get('l10n.showSolution'),
      () => {
        this.showSolutions({ showRetry: true });
      },
      this.params.behaviour.autoCheck &&
        this.params.behaviour.enableSolutionsButton,
      { 'aria-label': Dictionary.get('a11y.showSolution') }
    );

    // Retry button
    this.addButton(
      'try-again',
      Dictionary.get('l10n.retry'),
      () => {
        this.resetTask();
        this.lock.focus();
      },
      false,
      { 'aria-label': Dictionary.get('a11y.retry') }
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
      viewState: this.viewState,
      message: this.lock.getMessage(),
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
    const ariaText = Dictionary
      .get('a11y.correctCombination')
      .replace(
        /@combination/g, this.params.solution.match(charRegex()).join(', ')
      );

    this.lock.disable();
    this.announceMessage({
      text: Dictionary.get('l10n.correctCombination'),
      aria: ariaText
    });
    this.lock.showSolutions();

    // Announce message before some other element gets focus
    window.setTimeout(() => {
      this.setViewState('solutions');
      this.hideButton('check-answer');
      this.hideButton('show-solution');
      this.hideButton('try-again');
      if (params.showRetry) {
        if (this.params.behaviour.enableRetry) {
          this.showButton('try-again');
        }
        else {
          window.setTimeout(() => {
            this.lock.focus();      
          }, 50);
        }
      }
    }, 50);
  }

  /**
   * Reset task.
   */
  resetTask() {
    this.setViewState('task');
    this.attemptsLeft = this.maxAttempts;
    this.score = 0;
    this.wasAnswerGiven = false;

    if (!this.params.behaviour.autoCheck && this.maxAttempts !== Infinity) {
      const attemptsLeftText = Dictionary.get('l10n.attemptsLeft')
        .replace(/@number/g, this.attemptsLeft);

      const wrongCombinationText = Dictionary.get('a11y.wrongCombination');

      this.announceMessage({
        text: attemptsLeftText,
        aria: [wrongCombinationText, attemptsLeftText].join('. ')
      });
    }
    else {
      this.announceMessage({
        text: Dictionary.get('l10n.noMessage'),
        aria: ''
      });
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
   *
   * @param {object} [params={}] Parameters.
   * @param {boolean} params.skipXAPI If true, don't trigger xAPI events.
   */
  checkAnswer(params = {}) {
    this.handleAnswerGiven();

    const response = this.lock.getResponse();
    if (response === this.params.solution) {
      this.lock.disable();
      this.setViewState('results');

      this.score = this.maxAttempts === Infinity ? 1 : this.attemptsLeft;

      this.announceMessage({ text: Dictionary.get('l10n.lockOpen') });

      if (!params.skipXAPI) {
        this.triggerXAPIEvent('answered');
      }

      window.setTimeout(() => {      
        this.hideButton('check-answer');

        if (this.params.behaviour.autoCheck) {
          this.hideButton('show-solution');
        }
  
        if (this.params.behaviour.enableRetry) {
          this.showButton('try-again');
          setTimeout(() => {
            this.focusButton('try-again'); // Not done by H5P.Question
          }, 50);
        }
        else if (!params.skipXAPI) {
          this.lock.focus(); // Don't lose focus
        }
      }, 50);

      return;
    }

    if (!this.params.behaviour.autoCheck) {
      this.lock.showAnimationWrongCombination();
    }

    if (!this.params.behaviour.autoCheck && this.attemptsLeft === Infinity) {
      this.announceMessage({ text: Dictionary.get('l10n.wrongCombination') });
      
      return;
    }

    this.attemptsLeft = Math.max(0, this.attemptsLeft - 1);

    if (this.attemptsLeft === 0) {
      this.setViewState('results');
      this.lock.disable();

      this.score = 0;
      if (!params.skipXAPI) {
        this.triggerXAPIEvent('answered');
      }

      this.announceMessage({ text: Dictionary.get('l10n.lockDisabled') });

      // Lock disabled message should be read before other element gets focus
      window.setTimeout(() => {
        this.hideButton('check-answer');

        if (this.params.behaviour.enableSolutionsButton) {
          this.showButton('show-solution');
        }
  
        if (this.params.behaviour.enableRetry) {
          this.showButton('try-again');
        }
  
        // Don't lose focus
        if (
          !this.params.behaviour.enableSolutionsButton &&
          !this.params.behaviour.enableRetry
        ) {
          if (!params.skipXAPI) {
            window.setTimeout(() => {
              this.lock.focus();
            }, 50);
          }
        }
      }, 50);
    }
    else {
      if (!this.params.behaviour.autoCheck) {
        const attemptsLeftText = Dictionary.get('l10n.attemptsLeft')
          .replace(/@number/g, this.attemptsLeft);

        const wrongCombinationText = Dictionary.get('a11y.wrongCombination');

        this.announceMessage({
          text: attemptsLeftText,
          aria: [wrongCombinationText, attemptsLeftText].join('. ')
        });
      }      
    }
  }

  /**
   * Announce message as text and audio.
   *
   * @param {object} params Parameters.
   * @param {string} params.text Text.
   */
  announceMessage(params = {}) {
    if (!params.text) {
      return;
    }

    this.lock.setMessage(params.text);
    this.read(params.aria ?? params.text);
  }

  /**
   * Set view state.
   *
   * @param {string|number} state State to be set.
   */
  setViewState(state) {
    if (
      typeof state === 'string' &&
      CombinationLock.VIEW_STATES[state] !== undefined
    ) {
      this.viewState = CombinationLock.VIEW_STATES[state];
    }
    else if (
      typeof state === 'number' &&
      Object.values(CombinationLock.VIEW_STATES).includes(state)
    ) {
      this.viewState = state;

      this.content.setViewState(
        CombinationLock.VIEW_STATES.find((value) => value === state).keys[0]
      );
    }
  }

  /**
   * Handle lock disabled.
   */
  handleLockChanged() {
    this.handleAnswerGiven();

    if (this.params.behaviour.autoCheck) {
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
CombinationLock.DEFAULT_DESCRIPTION = 'Combination Lock';

/** @constant {object} view states */
CombinationLock.VIEW_STATES = { task: 0, results: 1, solutions: 2 };