import Util from '@services/util';
import Dictionary from '@services/dictionary';
import charRegex from 'char-regex';
import CombinationLock from '@scripts/h5p-combination-lock';
import Lock from '@components/lock';
import he from 'he';

/**
 * Mixin containing methods for initializing the content.
 */
export default class Initialization {
  /**
   * Sanitize parameters.
   */
  sanitize() {
    /*
     * this.params.behaviour.enableSolutionsButton and
     * this.params.behaviour.enableRetry are used by H5P's question type
     * contract.
     * @see {@link https://h5p.org/documentation/developers/contracts#guides-header-8}
     * @see {@link https://h5p.org/documentation/developers/contracts#guides-header-9}
     */

    // Sanitize parameters
    this.params = Util.extend({
      solution: 'H5P',
      alphabet: '',
      behaviour: {
        autoCheck: true,
        enableRetry: true,
        enableSolutionsButton: true,
        enableCheckButton: true
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
    }, this.params);

    // Handle potential override from parent content type
    if (!this.params.behaviour.enableCheckButton) {
      this.params.behaviour.autoCheck = true;
    }

    // Sanitize solution
    this.params.solution = Util.stripHTML(he.decode(this.params.solution));
    let symbols = this.params.solution.match(charRegex());
    if (!symbols || symbols?.length < 1) {
      symbols = ['H', '5', 'P'];
    }
    if (symbols.length > CombinationLock.SEGMENTS_MAX) {
      this.params.solution = symbols
        .slice(0, CombinationLock.SEGMENTS_MAX)
        .join('');

      console.warn(`${this.getTitle()}: The original solution was truncated because it was longer than ${CombinationLock.SEGMENTS_MAX} symbols that are allowed.`);
    }

    this.params.alphabet = he.decode(this.params.alphabet);

    // Sanitize alphabet
    this.params.alphabet = `${this.params.alphabet}${this.params.solution}`
      .match(charRegex()) // Ensure support for graphemes
      .reduce((sanitized, current) => {
        // Remove symbol duplicates
        if (sanitized.indexOf(current) === -1) {
          sanitized = `${sanitized}${current}`;
        }
        return sanitized;
      }, '');

    // Ensure that there are at least 3 symbols for scrolling on wheel
    while (this.params.alphabet.match(charRegex()).length < 3) {
      this.params.alphabet = `${this.params.alphabet}${this.params.alphabet}`;
    }
  }

  initialize() {
    const defaultLanguage = this.extras?.metadata?.defaultLanguage || 'en';
    this.languageTag = Util.formatLanguageCode(defaultLanguage);

    // Fill dictionary
    this.dictionary = new Dictionary();
    this.dictionary.fill({ l10n: this.params.l10n, a11y: this.params.a11y });

    // Retrieve previous state
    this.previousState = this.extras?.previousState || {};
    this.viewState = this.previousState.viewState ??
      CombinationLock.VIEW_STATES['task'];
    this.wasAnswerGiven = this.previousState.wasAnswerGiven ?? false;

    this.maxAttempts = this.params.behaviour.autoCheck ?
      Infinity :
      this.params.behaviour.maxAttempts ?? Infinity;

    this.attemptsLeft = this.previousState.attemptsLeft ?? this.maxAttempts;

    // Lock instance
    this.lock = new Lock(
      {
        dictionary: this.dictionary,
        alphabet: this.params.alphabet.match(charRegex()),
        solution: this.params.solution.match(charRegex()),
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

    // Relay H5P resize to lock component
    this.on('resize', () => {
      this.lock.resize();
    });
  }

  /**
   * Build main DOM.
   * @returns {HTMLElement} Main DOM.
   */
  buildDOM() {
    const dom = document.createElement('div');
    dom.classList.add('h5p-combination-lock-main');

    if (this.params.introduction) {
      const introduction = document.createElement('div');
      introduction.classList.add('h5p-combination-lock-introduction');

      const content = document.createElement('div');
      content.classList.add('h5p-combination-lock-intro-content');
      content.innerHTML = this.params.introduction;
      introduction.appendChild(content);

      dom.appendChild(introduction);
    }

    dom.appendChild(this.lock.getDOM());

    // Check answer button
    this.addButton(
      'check-answer',
      this.dictionary.get('l10n.check'),
      () => {
        this.checkAnswer();
      },
      !this.params.behaviour.autoCheck,
      { 'aria-label': this.dictionary.get('a11y.check') },
      {
        contentData: this.extras,
        textIfSubmitting: this.dictionary.get('l10n.submit')
      });

    // Show solution button
    this.addButton(
      'show-solution',
      this.dictionary.get('l10n.showSolution'),
      () => {
        this.showSolutions({ showRetry: true });
      },
      this.params.behaviour.autoCheck &&
        this.params.behaviour.enableSolutionsButton,
      { 'aria-label': this.dictionary.get('a11y.showSolution') }
    );

    // Retry button
    this.addButton(
      'try-again',
      this.dictionary.get('l10n.retry'),
      () => {
        this.resetTask();
        this.lock.focus();
      },
      false,
      { 'aria-label': this.dictionary.get('a11y.retry') }
    );

    return dom;
  }

  /**
   * Recreate the view state from previous state.
   */
  recreateViewState() {
    if (this.viewState === CombinationLock.VIEW_STATES['task']) {
      if (!this.params.behaviour.autoCheck && this.maxAttempts !== Infinity) {
        const attemptsLeftText = this.dictionary
          .get('l10n.attemptsLeft')
          .replace(/@number/g, this.attemptsLeft);

        const wrongCombinationText = this.dictionary
          .get('a11y.wrongCombination');

        this.announceMessage({
          text: attemptsLeftText,
          aria: [wrongCombinationText, attemptsLeftText].join('. ')
        });
      }
      else {
        this.announceMessage({
          text: this.dictionary.get('l10n.noMessage'),
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
}
