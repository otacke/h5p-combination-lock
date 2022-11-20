import Dictionary from '@services/dictionary';
import charRegex from 'char-regex';

/**
 * Mixin containing methods for H5P Question Type contract.
 */
export default class QuestionTypeContract {

  /**
   * Determine whether the task was answered already.
   *
   * @returns {boolean} True if answer was given by user, else false.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-1}
   */
  getAnswerGiven() {
    return this.wasAnswerGiven;
  }

  /**
   * Get current score.
   *
   * @returns {number} Current score.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-2}
   */
  getScore() {
    const autoCheckScore = (this.lock.getResponse() === this.params.solution) ?
      1 :
      0;

    return (this.attemptsLeft === Infinity) ?
      autoCheckScore :
      this.attemptsLeft;
  }

  /**
   * Get maximum possible score.
   *
   * @returns {number} Maximum possible score.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-3}
   */
  getMaxScore() {
    return (this.maxAttempts === Infinity) ? 1 : this.maxAttempts;
  }

  /**
   * Show solutions.
   *
   * @param {object} params Parameters.
   * @param {boolean} params.showRetry If true and valid, show retry button.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-4}
   */
  showSolutions(params = {}) {
    const ariaText = Dictionary
      .get('a11y.correctCombination')
      .replace(
        /@combination/g, this.params.solution.match(charRegex()).join(', ')
      );

    this.lock.disable();
    this.lock.showSolutions();

    this.announceMessage({
      text: Dictionary.get('l10n.correctCombination'),
      aria: ariaText
    });

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
            this.lock.focus(); // No button to focus, focus lock instead
          }, 50);
        }
      }
    }, 50);
  }

  /**
   * Reset task.
   *
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-5}
   */
  resetTask() {
    this.setViewState('task');
    this.attemptsLeft = this.maxAttempts;
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
   * Get xAPI data.
   *
   * @returns {object} XAPI statement.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
   */
  getXAPIData() {
    const xAPIEvent = this.createXAPIEvent('answered');
    return {
      statement: xAPIEvent.data.statement
    };
  }
}
