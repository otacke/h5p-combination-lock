import Util from '@services/util';
import Dictionary from '@services/dictionary';
import QuestionTypeContract from './mixins/question-type-contract';
import Initialization from './mixins/initialization';
import Xapi from './mixins/xapi';
import '@styles/h5p-combination-lock.scss';

export default class CombinationLock extends H5P.Question {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras={}] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super('combination-lock');

    Util.addMixins(
      CombinationLock, [QuestionTypeContract, Initialization, Xapi]
    );

    /*
     * this.params.behaviour.enableSolutionsButton and
     * this.params.behaviour.enableRetry are used by H5P's question type
     * contract.
     * @see {@link https://h5p.org/documentation/developers/contracts#guides-header-8}
     * @see {@link https://h5p.org/documentation/developers/contracts#guides-header-9}
     */

    this.params = params;
    this.contentId = contentId;
    this.extras = extras;

    // Inititialization mixin
    this.sanitize();
    this.initialize();
    this.dom = this.buildDOM();
    this.recreateViewState();
  }

  /**
   * Register the DOM elements with H5P.Question.
   */
  registerDomElements() {
    // Register content
    this.setContent(this.dom);
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
   * Check answer.
   *
   * @param {object} [params={}] Parameters.
   * @param {boolean} params.skipXAPI If true, don't trigger xAPI events.
   */
  checkAnswer(params = {}) {
    this.handleAnswerGiven();

    if (this.lock.getResponse() === this.params.solution) {
      this.handleCorrectResponse(params);
      return;
    }

    if (!this.params.behaviour.autoCheck) {
      this.lock.showAnimationWrongCombination();
    }

    this.attemptsLeft = Math.max(0, this.attemptsLeft - 1);

    if (this.attemptsLeft === 0) {
      this.handleFinalWrongResponse(params);
    }
    else if (!this.params.behaviour.autoCheck) {
      this.handleIntermediaryWrongResponse();
    }
  }

  /**
   * Handle correct response.
   *
   * @param {object} [params={}] Parameters.
   * @param {boolean} params.skipXAPI If true, don't trigger xAPI events.
   */
  handleCorrectResponse(params = {}) {
    this.lock.disable();
    this.setViewState('results');

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
        this.lock.focus(); // No button to focus, focus lock instead
      }
    }, 50);
  }

  /**
   * Handle intermediary wrong response.
   */
  handleIntermediaryWrongResponse() {
    if (this.attemptsLeft === Infinity) {
      this.announceMessage({ text: Dictionary.get('l10n.wrongCombination') });

      return;
    }

    const attemptsLeftText = Dictionary.get('l10n.attemptsLeft')
      .replace(/@number/g, this.attemptsLeft);

    const wrongCombinationText = Dictionary.get('a11y.wrongCombination');

    this.announceMessage({
      text: attemptsLeftText,
      aria: [wrongCombinationText, attemptsLeftText].join('. ')
    });
  }

  /**
   * Handle final wrong response.
   *
   * @param {object} [params={}] Parameters.
   * @param {boolean} params.skipXAPI If true, don't trigger xAPI events.
   */
  handleFinalWrongResponse(params = {}) {
    this.setViewState('results');
    this.lock.disable();

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

      if (
        !this.params.behaviour.enableSolutionsButton &&
        !this.params.behaviour.enableRetry
      ) {
        if (!params.skipXAPI) {
          window.setTimeout(() => {
            this.lock.focus(); // No button to focus, focus lock instead
          }, 50);
        }
      }
    }, 50);
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
    this.read(params.aria ?? params.text); // H5P.Question function
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

/** @constant {object} VIEW_STATES view states */
CombinationLock.VIEW_STATES = { task: 0, results: 1, solutions: 2 };

/** @constant {number} SEGMENTS_MAX Maximum number of segments */
CombinationLock.SEGMENTS_MAX = 6;
