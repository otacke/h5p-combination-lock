import Util from '@services/util.js';
import Dictionary from '@services/dictionary';
import LockSegment from './lock-segment';
import MessageDisplay from './message-display';
import './lock.scss';

/** Segment */
export default class Lock {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {string[]} params.alphabet Alphabet for segments.
   * @param {string[]} params.solution Solution symbols.
   * @param {boolean} params.autoCheck If true, check solution automatically.
   * @param {number|Infinity} params.maxAttempts Number of maximum attempts.
   * @param {object} [params.previousState={}] Previously stored state.
   * @param {object} callbacks Callbacks.
   * @param {function} callbacks.onChanged Called when lock is changed.
   * @param {function} callbacks.onResized Called when lock is resized.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      previousState: {}
    }, params);

    this.callbacks = Util.extend({
      onChanged: () => {},
      onResized: () => {}
    }, callbacks);

    this.segments = this.params.solution.map((symbol, index) => {
      const segment = new LockSegment(
        {
          index: index,
          total: this.params.solution.length,
          solution: symbol,
          alphabet: this.params.alphabet,
          position: this.params.previousState?.positions[index] ?? null
        },
        {
          onChanged: () => {
            this.handleSegmentChanged();              
          }
        }
      );

      return segment;
    });

    this.currentSegmentId = 0;
    this.handleAnimationEnded = this.handleAnimationEnded.bind(this);

    this.buildDOM();
    this.updateConfigurationAria();
  }

  /**
   * Build DOM. Using spin button design pattern for a11y.
   *
   * @see https://www.w3.org/WAI/ARIA/apg/example-index/spinbutton/datepicker-spinbuttons.html
   */
  buildDOM() {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-combination-lock-case');

    const lock = document.createElement('div');
    lock.classList.add('h5p-combination-lock-elements');
    this.dom.appendChild(lock);
   
    const groupLabelId = H5P.createUUID();
    const configurationId = H5P.createUUID();

    this.segmentsDOM = document.createElement('div');
    this.segmentsDOM.classList.add('h5p-combination-lock-segments');
    this.segmentsDOM.setAttribute('role', 'group');
    this.segmentsDOM.setAttribute(
      'aria-labelledby', `${groupLabelId} ${configurationId}`
    );
    lock.appendChild(this.segmentsDOM);

    this.groupLabel = document.createElement('div');
    this.groupLabel.classList.add('h5p-combination-lock-group-label');
    this.groupLabel.setAttribute('id', groupLabelId);
    this.groupLabel.innerText = `${Dictionary.get('a11y.combinationLock')}.`;
    this.segmentsDOM.appendChild(this.groupLabel);

    // Will announce current combination for all segments
    this.currentCombination = document.createElement('div');
    this.currentCombination.classList.add(
      'h5p-combination-lock-current-combination-aria');
    this.currentCombination.setAttribute('id', configurationId);
    this.segmentsDOM.appendChild(this.currentCombination);

    this.segments.forEach((segment) => {
      this.segmentsDOM.appendChild(segment.getDOM());
    });

    this.messageDisplay = new MessageDisplay();
    lock.appendChild(this.messageDisplay.getDOM());
  }

  /**
   * Return the DOM for this class.
   *
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Resize.
   */
  resize() {  
    this.messageDisplay.setWidth(
      this.segmentsDOM.getBoundingClientRect().width
    );
  }

  /**
   * Get response.
   *
   * @returns {string} Response.
   */
  getResponse() {
    return this.segments.map((segment) => segment.getResponse()).join('');
  }

  /**
   * Get current positions of segments.
   *
   * @returns {number[]} Current positions of segments.
   */
  getPositions() {
    return this.segments.map((segment) => segment.getPosition());
  }

  /**
   * Get current state.
   *
   * @returns {object} Current state.
   */
  getCurrentState() {
    return {
      positions: this.getPositions()
    };
  }

  /**
   * Set text.
   *
   * @param {string} text Text to display.
   */
  setMessage(text) {
    this.messageDisplay.setText(text);
  }

  /**
   * Get text.
   *
   * @returns {string} Text from display.
   */
  getMessage() {
    return this.messageDisplay.getText();
  }

  /**
   * Focus.
   */
  focus() {
    this.segments[0].focus();
  }

  /**
   * Enable lock.
   */
  enable() {
    this.segments.forEach((segment) => {
      segment.enable();
    });    
  }

  /**
   * Disable lock.
   */
  disable() {
    this.segments.forEach((segment) => {
      segment.disable();
    });
  }  

  /**
   * Update combination aria.
   */
  updateConfigurationAria() {
    const symbolString = this.segments
      .map((segment) => segment.getResponse())
      .join(', ');

    let text = Dictionary
      .get('a11y.currentSymbols')
      .replace(/@symbols/g, symbolString);
    if (text.substring(text.length - 1) !== '.') {
      text = `${text}.`;
    }

    this.currentCombination.innerText = text;
  }

  /**
   * Show solutions.
   */
  showSolutions() {
    this.segments.forEach((segment) => {
      segment.showSolutions();
    });

    this.updateConfigurationAria();
  }

  /**
   * Reset.
   */
  reset() {
    this.enable();
    this.segments.forEach((segment) => {
      segment.reset();
    });

    this.updateConfigurationAria();
  }

  /**
   * Handle animation ended.
   */
  showAnimationWrongCombination() {
    if (this.isAnimating) {
      return;
    }

    this.isAnimating = true;
    this.dom.addEventListener('animationend', this.handleAnimationEnded);
    this.dom.classList.add('wrong-combination');
    this.dom.classList.add('animate');
  }

  /**
   * Handle animation ended.
   */
  handleAnimationEnded() {  
    this.dom.classList.remove('animate');
    this.dom.classList.remove('wrong-combination');
    this.dom.addEventListener('animationend', this.handleAnimationEnded);
    this.isAnimating = false;    
  }

  /**
   * Handle segment changed.
   */
  handleSegmentChanged() {
    this.updateConfigurationAria();
    this.callbacks.onChanged();
  }

  /**
   * Handle segment activation.
   *
   * @param {KeyboardEvent.key} key Key for movement.
   */
  handleSegmentAction(key) {
    if (key === 'ArrowLeft' && this.currentSegmentId > 0) {
      this.currentSegmentId--;
    }
    else if (
      key === 'ArrowRight' && this.currentSegmentId < this.segments.length - 1
    ) {
      this.currentSegmentId++;
    }
    else if (key === 'Home') {
      this.currentSegmentId = 0;
    }
    else if (key === 'End') {
      this.currentSegmentId = this.segments.length - 1;
    }
    else if (key === 'ArrowUp') {
      this.segments[this.currentSegmentId].changeToNextSymbol();
      this.segments[this.currentSegmentId].blur();
      this.segments[this.currentSegmentId].focus();
    }
    else if (key === 'ArrowDown') {
      this.segments[this.currentSegmentId].changeToPreviousSymbol();
      this.segments[this.currentSegmentId].blur();
      this.segments[this.currentSegmentId].focus();
    }
    else {
      return;
    }

    this.segments[this.currentSegmentId].focus();
  }
}