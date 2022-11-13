import charRegex from 'char-regex';
import Util from '@services/util.js';
import './lock.scss';
import LockSegment from './lock-segment';

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

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-combination-lock-lock-case');

    const lock = document.createElement('div');
    lock.classList.add('h5p-combination-lock-lock');
    this.dom.appendChild(lock);

    this.segments.forEach((segment) => {
      lock.appendChild(segment.getDOM());
    });
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
   * Handle segment changed.
   */
  handleSegmentChanged() {
    this.callbacks.onChanged();
  }
}