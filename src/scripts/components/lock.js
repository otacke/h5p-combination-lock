import charRegex from 'char-regex';
import Util from '@services/util.js';
import './lock.scss';
import LockSegment from './lock-segment';
import MessageDisplay from './message-display';

/** Segment */
export default class Lock {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {object} callbacks Callbacks.
   * @param {function} callbacks.onChanged Called when lock is changed.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);
    this.callbacks = Util.extend({
      onChanged: () => {}
    }, callbacks);

    this.segments = this.params.solution
      .match(charRegex())
      .map((symbol, index) => {
        return new LockSegment(
          {
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
      });   

    this.handleAnimationEnded = this.handleAnimationEnded.bind(this);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-combination-lock-case');

    const lock = document.createElement('div');
    lock.classList.add('h5p-combination-lock-elements');
    this.dom.appendChild(lock);

    const segments = document.createElement('div');
    segments.classList.add('h5p-combination-lock-segments');
    lock.appendChild(segments);

    this.segments.forEach((segment) => {
      segments.appendChild(segment.getDOM());
    });

    this.messageDisplay = new MessageDisplay();
    lock.appendChild(this.messageDisplay.getDOM());

    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].intersectionRatio === 1) {
        this.observer.unobserve(this.dom);
        this.messageDisplay.setWidth(segments.getBoundingClientRect().width);
      }
    }, {
      root: document.documentElement,
      threshold: [1]
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
   * Show solutions.
   */
  showSolutions() {
    this.segments.forEach((segment) => {
      segment.showSolutions();
    });
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
    this.callbacks.onChanged();
  }
}