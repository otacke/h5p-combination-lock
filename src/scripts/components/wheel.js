import Util from '@services/util.js';
import Dictionary from '@services/dictionary';
import './wheel.scss';

/** Wheel */
export default class Wheel {
  /**
   * @class
   * @param {object} params Parameters.
   * @param {object} callbacks Callbacks.
   * @param {function} callbacks.onClicked Called when button is clicked.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);
    this.callbacks = Util.extend({
      onChanged: () => {},
      onFocusChanged: () => {}
    }, callbacks);

    this.oldIndex = this.params.position || 0;

    this.blockEventPropagation = this.blockEventPropagation.bind(this);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-combination-lock-wheel');

    this.list = document.createElement('div');
    this.list.classList.add('h5p-combination-lock-wheel-list');
    this.list.classList.add('transition');
    this.dom.appendChild(this.list); 

    // Copy of first and last symbol required for simulating "infinite" wheel
    const alphabetPlus = [
      this.params.alphabet[this.params.alphabet.length - 1],
      ...this.params.alphabet,
      this.params.alphabet[0]
    ];

    this.items = alphabetPlus.map((symbol) => {
      const item = document.createElement('div');
      item.classList.add('h5p-combination-lock-wheel-listitem');
      item.classList.add('cloaked');
      item.setAttribute('aria-hidden', 'true');
      item.innerText = symbol;
      return item;
    });

    this.items.forEach((item) => {
      this.list.appendChild(item);
    });

    this.spinbutton = document.createElement('div');
    this.spinbutton.classList.add('h5p-combination-lock-wheel-spinbutton');
    this.spinbutton.setAttribute('role', 'spinbutton');
    this.spinbutton.setAttribute('tabindex', '0');
    this.spinbutton.setAttribute(
      'aria-label',
      Dictionary.get('a11y.segment')
        .replace(/@number/g, this.params.index + 1)
        .replace(/@total/g, this.params.total)
    );
    this.spinbutton.addEventListener('keydown', (event) => {
      this.handleKeydown(event);
    });
    this.spinbutton.addEventListener('focus', () => {
      this.callbacks.onFocusChanged(true);
    });
    this.spinbutton.addEventListener('blur', () => {
      this.callbacks.onFocusChanged(false);
    });

    this.dom.appendChild(this.spinbutton);
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
   * Set position.
   *
   * @param {number} position New position.
   */
  setPosition(position) {
    /*
     * Simulates "infinite" wheel by scrolling to copied symbol first and
     * then jumping to back/forth to original symbol after scrolling is done
     */
    if (
      this.oldIndex - 1 === 0 &&
      position === this.params.alphabet.length - 1
    ) {
      // Overflow scrolling up
      this.oldIndex = 0;
      setTimeout(() => {
        this.oldIndex = this.params.alphabet.length;
        this.scrollTo({ index: this.oldIndex, noAnimation: true });
      }, 250);      
    }
    else if (this.oldIndex === this.params.alphabet.length && position === 0) {
    // Overflow scrolling down
      this.oldIndex = this.params.alphabet.length + 1;
      setTimeout(() => {
        this.oldIndex = 1;
        this.scrollTo({ index: this.oldIndex, noAnimation: true });
      }, 250);
    }
    else {
      this.oldIndex = position + 1;
    }

    this.scrollTo({ index: this.oldIndex });
  }

  /**
   * Scroll to index on wheel.
   *
   * @param {object} params Parameters.
   * @param {number} params.index Index to scroll to.
   * @param {boolean} params.noAnimation If true, jump instead of scrolling.
   */
  scrollTo(params = {}) {
    if (typeof params.index !== 'number') {
      return;
    }
   
    const alphabetIndex = (params.index - 1 + this.params.alphabet.length) %
    this.params.alphabet.length;
    
    this.spinbutton.setAttribute('aria-valuenow', `${alphabetIndex}`);
    this.spinbutton.setAttribute(
      'aria-valuetext', this.params.alphabet[alphabetIndex]
    );

    this.wheelHeight = this.wheelHeight ||
      this.dom.getBoundingClientRect().height; 
    this.itemHeight = this.itemHeight ||
      this.list.childNodes[0].getBoundingClientRect().height;
    this.itemOffset = (this.wheelHeight - this.itemHeight) / 2;
    
    const translation =
      `translateY(${-params.index * this.itemHeight + this.itemOffset}px)`;

    if (!params.noAnimation) {
      this.list.style.transform = translation;
      return;
    }

    this.list.classList.remove('transition');
    window.requestAnimationFrame(() => {
      this.list.style.transform = translation;
      this.focusSpinbutton();

      window.requestAnimationFrame(() => {
        this.list.classList.add('transition');
      });
    });
  }

  /**
   * Uncloak list items.
   */
  uncloak() {
    this.items.forEach((item) => {
      item.classList.remove('cloaked');
    });
  }

  /**
   * Focus spinbutton.
   */
  focusSpinbutton() {
    this.spinbutton.focus();
  }

  /**
   * Handle key down on spinbutton.
   *
   * @param {KeyboardEvent} event Keyboard event
   */
  handleKeydown(event) {
    if (this.isDisabled || event.repeat || this.isTransitioning) {
      event.stopPropagation();
      event.preventDefault();
      return;
    }
  
    if (event.target.getAttribute('role') !== 'spinbutton') {
      return; // Just to be sure ...
    }

    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.stopPropagation();
      event.preventDefault();

      this.callbacks.onChanged(event.key);
    }
  }

  /**
   * Block event propagation.
   *
   * @param {Event} event Event.
   */
  blockEventPropagation(event) {
    event.stopPropagation();
    event.preventDefault();
  }

  /**
   * Cooldown. Workaround for transitionend event that may never be called.
   *
   * @param {number} timeout Timeout.
   */
  cooldown(timeout) {
    window.clearTimeout(this.cooldownTimeout);
    this.handleTransitionStart();

    window.setTimeout(() => {
      this.handleTransitionEnd();
    }, timeout);
  }

  /**
   * Handle transitionstart.
   */
  handleTransitionStart() {
    this.isTransitioning = true;

    // Prevent moving page around via body when spinbutton loses focus.
    document.body.addEventListener('keydown', this.blockEventPropagation);
  }

  /**
   * Handle transitionend.
   */
  handleTransitionEnd() {   
    document.body.removeEventListener('keydown', this.blockEventPropagation);

    this.isTransitioning = false;
  }
}