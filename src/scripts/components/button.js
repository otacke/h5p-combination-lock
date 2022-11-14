import Util from '@services/util.js';
import './button.scss';

/** Button */
export default class Button {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {object} callbacks Callbacks.
   * @param {function} callbacks.onClicked Called when button is clicked.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      id: H5P.createUUID(),
      label: '\u1F605',
      classes: [],
      a11y: {}
    }, params);

    this.callbacks = Util.extend({
      onClicked: () => {}
    }, callbacks);

    this.isDisabled = false;

    this.dom = document.createElement('button');
    this.dom.classList.add('h5p-combination-lock-button');
    this.params.classes.forEach((style) => {
      if (typeof style === 'string') {
        this.dom.classList.add(style);
      }
    });
    this.dom.innerText = this.params.label;
    this.dom.addEventListener('click', () => {
      this.handleClicked();
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
   * Handle button clicked.
   */
  handleClicked() {
    if (this.isDisabled) {
      return;
    }

    this.callbacks.onClicked();
  }

  /**
   * Enable.
   */
  enable() {
    this.isDisabled = false;
    this.dom.classList.remove('disabled');
    this.dom.removeAttribute('tabindex');
  }

  /**
   * Disable.
   */
  disable() {
    this.isDisabled = true;
    this.dom.classList.add('disabled');
    this.dom.setAttribute('tabindex', -1);
  }

  /**
   * Set aria label.
   *
   * @param {string | null} ariaLabel Aria label.
   */
  setAriaLabel(ariaLabel = null) {
    if (typeof ariaLabel === 'string') {
      this.dom.setAttribute('aria-label', ariaLabel);
    }
    else {
      this.dom.removeAttribute('aria-label');
    }
  }
}