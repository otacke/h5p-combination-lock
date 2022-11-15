import charRegex from 'char-regex';
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
   * @param {object} callbacks Callbacks.
   * @param {function} callbacks.onChanged Called when lock is changed.
   * @param {function} callbacks.onResized Called when lock is resized.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);
    this.callbacks = Util.extend({
      onChanged: () => {}
    }, callbacks);

    this.segments = this.params.solution
      .match(charRegex())
      .map((symbol, index) => {
        const segment = new LockSegment(
          {
            id: index,
            total: this.params.solution.match(charRegex()).length,
            solution: symbol,
            alphabet: this.params.alphabet,
            position: this.params.previousState?.positions ?
              this.params.previousState.positions[index] :
              null
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

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-combination-lock-case');

    const lock = document.createElement('div');
    lock.classList.add('h5p-combination-lock-elements');
    this.dom.appendChild(lock);
    
    const groupLabelId = H5P.createUUID();
    const configurationId = H5P.createUUID();

    const segments = document.createElement('div');
    segments.classList.add('h5p-combination-lock-segments');
    segments.setAttribute('role', 'group');
    segments.setAttribute(
      'aria-labelledby', `${groupLabelId} ${configurationId}`
    );
    lock.appendChild(segments);

    this.groupLabel = document.createElement('div');
    this.groupLabel.classList.add('h5p-combination-lock-group-label');
    this.groupLabel.setAttribute('id', groupLabelId);
    this.groupLabel.innerText = `${Dictionary.get('a11y.combinationLock')}.`;
    segments.appendChild(this.groupLabel);

    this.configuration = document.createElement('div');
    this.configuration.classList.add('h5p-combination-lock-configuration-aria');
    this.configuration.setAttribute('id', configurationId);
    segments.appendChild(this.configuration);

    this.segments.forEach((segment) => {
      segments.appendChild(segment.getDOM());
    });

    this.messageDisplay = new MessageDisplay();
    this.messageDisplay.hide();
    lock.appendChild(this.messageDisplay.getDOM());

    this.updateConfigurationAria();

    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].intersectionRatio > 0) {
        this.observer.unobserve(this.dom);

        this.messageDisplay.setWidth(segments.getBoundingClientRect().width);
        this.messageDisplay.show();

        this.callbacks.onResized();
      }
    }, {
      root: document.documentElement,
      threshold: 0
    });
    this.observer.observe(this.dom);
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
   * Focus.
   */
  focus() {
    this.segments[0].focus();
  }

  /**
   * Update tablist label.
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

    this.configuration.innerText = text;
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
   * Show solutions.
   */
  showSolutions() {
    this.segments.forEach((segment) => {
      segment.showSolutions();
    });

    this.updateConfigurationAria();
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