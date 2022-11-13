import Util from '@services/util.js';
import './message-display.scss';

/** MessageDisplay */
export default class MessageDisplay {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {object} callbacks Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);
    this.callbacks = Util.extend({}, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-combination-lock-message-display');
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
   * Set width.
   *
   * @param {number} width Width.
   */
  setWidth(width) {
    this.dom.style.width = `${width}px`;
  }

  /**
   * Set text.
   *
   * @param {string} text Text to display.
   */
  setText(text) {
    this.dom.innerText = text;
  }
}