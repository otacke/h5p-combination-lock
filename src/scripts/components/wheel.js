import Util from '@services/util.js';
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
    this.callbacks = Util.extend({}, callbacks);

    this.oldIndex = this.params.position || 0;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-combination-lock-wheel');

    this.list = document.createElement('ol');
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
      const item = document.createElement('li');
      item.classList.add('h5p-combination-lock-wheel-listitem');
      item.classList.add('cloaked');
      item.innerText = symbol;

      return item;
    });

    this.items.forEach((item) => {
      this.list.appendChild(item);
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

      window.requestAnimationFrame(() => {
        this.list.classList.add('transition');
      });
    });
  }

  /**
   * Uncloak list items.
   */
  uncloak() {
    this.list.childNodes.forEach((child) => {
      child.classList.remove('cloaked');
    });
  }
}