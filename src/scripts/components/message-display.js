import './message-display.scss';

/** MessageDisplay */
export default class MessageDisplay {
  /**
   * @class
   */
  constructor() {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-combination-lock-message-display');
  }

  /**
   * Return the DOM for this class.
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set width.
   * @param {number} width Width.
   */
  setWidth(width) {
    this.dom.style.maxWidth = `${width}px`;
  }

  /**
   * Set text.
   * @param {string} text Text to display.
   */
  setText(text) {
    this.dom.innerText = text;
  }

  /**
   * Get text.
   * @returns {string} Text from display.
   */
  getText() {
    return this.dom.innerText;
  }
}
