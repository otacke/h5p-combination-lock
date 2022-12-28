import Util from '@services/util.js';
import Dictionary from '@services/dictionary';
import Button from './button';
import './lock-segment.scss';
import Wheel from './wheel';

/** Segment */
export default class LockSegment {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {number} params.index This segment's index.
   * @param {number} params.total Total number of segments.
   * @param {string} params.solution Symbol that is this segment's solution.
   * @param {string[]} params.alphabet This segment's alphabet.
   * @param {number|null} params.position Start position (from previous state).
   * @param {object} callbacks Callbacks.
   * @param {function} callbacks.onChanged Called when position changed.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);
    this.callbacks = Util.extend({ onChanged: () => {} }, callbacks);

    this.position = this.params.position ??
      Math.floor(Math.random() * this.params.alphabet.length);

    const currentSymbol = this.params.alphabet[this.position];

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-combination-lock-segment');

    this.buttonNext = new Button(
      { id: 'next', label: '\u25b2', classes: ['top'] },
      {
        onClicked: () => {
          this.changeSymbol((this.position + this.params.alphabet.length - 1) %
            this.params.alphabet.length
          );
        }
      }
    );
    this.buttonNext.setAriaLabel([
      Dictionary.get('a11y.nextSymbol'),
      Dictionary.get('a11y.currentSymbol').replace(/@symbol/g, currentSymbol)
    ]);
    this.dom.appendChild(this.buttonNext.getDOM());

    this.wheel = new Wheel(
      {
        alphabet: this.params.alphabet,
        position: this.position,
        index: this.params.index,
        total: this.params.total
      },
      {
        onChanged: (key) => {
          this.handleWheelChanged(key);
        },
        onFocusChanged: (focusOn) => {
          this.dom.classList.toggle('focus', focusOn);
        }
      }
    );
    this.dom.appendChild(this.wheel.getDOM());

    this.buttonPrevious = new Button(
      { id: 'previous', label: '\u25bc', classes: ['bottom'] },
      {
        onClicked: () => {
          this.changeSymbol((this.position + 1) % this.params.alphabet.length);
        }
      }
    );
    this.buttonPrevious.setAriaLabel([
      Dictionary.get('a11y.previousSymbol'),
      Dictionary.get('a11y.currentSymbol').replace(/@symbol/g, currentSymbol)
    ]);
    this.dom.appendChild(this.buttonPrevious.getDOM());

    // iOS is behind ... Again ...
    const callback = window.requestIdleCallback ?
      window.requestIdleCallback :
      window.requestAnimationFrame;

    callback(() => {
      // Get started once visible and ready
      this.observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          this.observer.unobserve(this.dom);
          this.setPosition(this.position);
          this.wheel.uncloak();
        }
      }, {
        threshold: 0
      });
      this.observer.observe(this.dom);
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
   * Get current response.
   *
   * @returns {string} Current response.
   */
  getResponse() {
    return this.params.alphabet[this.position];
  }

  /**
   * Get current position.
   *
   * @returns {number} Current position.
   */
  getPosition() {
    return this.position;
  }

  /**
   * Focus.
   */
  focus() {
    this.wheel.focusSpinbutton();
  }

  /**
   * Enable.
   */
  enable() {
    this.isDisabled = false;

    this.buttonNext.enable();
    this.buttonPrevious.enable();

    const currentSymbol = this.params.alphabet[this.position];
    this.buttonNext.setAriaLabel([
      Dictionary.get('a11y.nextSymbol'),
      Dictionary.get('a11y.currentSymbol').replace(/@symbol/g, currentSymbol)
    ]);
    this.buttonPrevious.setAriaLabel([
      Dictionary.get('a11y.previousSymbol'),
      Dictionary.get('a11y.currentSymbol').replace(/@symbol/g, currentSymbol)
    ]);
  }

  /**
   * Disable.
   */
  disable() {
    this.isDisabled = true;

    clearTimeout(this.cooldownTimeout);

    this.buttonNext.disable();
    this.buttonPrevious.disable();

    this.buttonNext.setAriaLabel([
      Dictionary.get('a11y.nextSymbol'),
      Dictionary.get('a11y.disabled')
    ]);
    this.buttonNext.setAriaLabel([
      Dictionary.get('a11y.previousSymbol'),
      Dictionary.get('a11y.disabled')
    ]);
  }

  /**
   * Reset.
   */
  reset() {
    this.enable();
    this.setPosition(Math.floor(Math.random() * this.params.alphabet.length));
  }

  /**
   * Show solutions.
   */
  showSolutions() {
    this.setPosition(this.params.alphabet.indexOf(this.params.solution));
  }

  /**
   * Set position.
   *
   * @param {number} position New position.
   */
  setPosition(position) {
    this.position = position;
    this.wheel.setPosition(this.position);

    const currentSymbol = this.params.alphabet[this.position];
    const buttonSymbol = (this.isDisabled) ?
      Dictionary.get('a11y.disabled') :
      Dictionary.get('a11y.currentSymbol').replace(/@symbol/g, currentSymbol);

    this.buttonNext.setAriaLabel([
      Dictionary.get('a11y.nextSymbol'),
      buttonSymbol
    ]);

    this.buttonPrevious.setAriaLabel([
      Dictionary.get('a11y.previousSymbol'),
      buttonSymbol
    ]);
  }

  /**
   * Change symbol.
   *
   * @param {number} position New position.
   */
  changeSymbol(position) {
    if (this.isCoolingDown) {
      return;
    }

    this.setPosition(position);
    this.callbacks.onChanged();

    // Allow setting while not disabled without cooling down
    if (this.isDisabled) {
      return;
    }

    this.cooldown();
  }

  /**
   * Cooldown. Workaround, because transitionend is unreliable.
   */
  cooldown() {
    if (this.isCoolingDown) {
      return;
    }
    this.isCoolingDown = true;

    this.buttonPrevious.disable();
    this.wheel.cooldown(LockSegment.COOLDOWN_TIMEOUT_MS);
    this.buttonNext.disable();

    clearTimeout(this.cooldownTimeout);
    this.cooldownTimeout = setTimeout(() => {
      this.buttonPrevious.enable();
      this.buttonNext.enable();

      this.isCoolingDown = false;
    }, LockSegment.COOLDOWN_TIMEOUT_MS);
  }

  /**
   * Handle wheel changed.
   *
   * @param {string} key KeyboardEvent key.
   */
  handleWheelChanged(key) {
    let position;

    if (key === 'ArrowUp') {
      position = (this.position + this.params.alphabet.length - 1) %
        this.params.alphabet.length;
    }
    else if (key === 'ArrowDown') {
      position = (this.position + 1) % this.params.alphabet.length;
    }
    else if (key === 'Home') {
      position = 0;
    }
    else if (key === 'End') {
      position = this.params.alphabet.length - 1;
    }
    else {
      return;
    }

    this.changeSymbol(position);
  }
}

/** @constant {number} COOLDOWN_TIMEOUT_MS Cooldown timeout in ms */
LockSegment.COOLDOWN_TIMEOUT_MS = 275;
