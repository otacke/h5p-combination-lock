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
   * @param {object} callbacks Callbacks.
   * @param {function} callbacks.onChanged Called when position changed.
   * @param {function} callbacks.onKeyDown Called when using controls.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);
    this.callbacks = Util.extend({
      onChanged: () => {},
      onKeydown: () => {}
    }, callbacks);
    
    this.position = this.params.position ??
      Math.floor(Math.random() * this.params.alphabet.length);

    const currentSymbol = this.params.alphabet[this.position];

    const tabId = H5P.createUUID();
    const tabPanelId = H5P.createUUID();

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-combination-lock-segment');

    this.tab = document.createElement('button');
    this.tab.classList.add('h5p-combination-lock-segment-tab');
    this.tab.setAttribute('id', tabId);
    this.tab.setAttribute('role', 'tab');
    this.tab.setAttribute('aria-controls', tabPanelId);
    this.tab.setAttribute('aria-label', currentSymbol);
    this.tab.addEventListener('keydown', (event) => {
      this.handleKeydown(event);
    });
    this.dom.appendChild(this.tab);

    this.panel = document.createElement('div');
    this.panel.classList.add('h5p-combination-lock-segment-panel');
    this.panel.setAttribute('role', 'tabpanel');
    this.panel.setAttribute('aria-labelledby', tabId);
    this.dom.appendChild(this.panel);

    this.buttonNext = new Button(
      { id: 'next', label: '\u25b2', classes: ['top'] },
      {
        onClicked: () => {
          this.changeToNextSymbol();
        }
      }
    );
    this.buttonNext.setAriaLabel([
      Dictionary.get('a11y.nextSymbol'),
      Dictionary.get(`a11y.currentSymbol`).replace(/@symbol/g, currentSymbol)
    ]);
    this.panel.appendChild(this.buttonNext.getDOM());

    this.wheel = new Wheel({
      alphabet: this.params.alphabet,
      position: this.position
    });
    this.panel.appendChild(this.wheel.getDOM());

    this.buttonPrevious = new Button(
      { id: 'previous', label: '\u25bc', classes: ['bottom'] },
      {
        onClicked: () => {
          this.changeToPreviousSymbol();
        }
      }
    );
    this.buttonPrevious.setAriaLabel([
      Dictionary.get('a11y.previousSymbol'),
      Dictionary.get(`a11y.currentSymbol`).replace(/@symbol/g, currentSymbol)
    ]);
    this.panel.appendChild(this.buttonPrevious.getDOM());
   
    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].intersectionRatio > 0) {
        this.observer.unobserve(this.dom);
        this.setPosition(this.position);
        this.wheel.uncloak();
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
   * Activate.
   */
  activate() {
    this.tab.removeAttribute('tabindex');
    this.tab.setAttribute('aria-selected', 'true');

    this.buttonNext.activate();
    this.buttonPrevious.activate();   
  }

  /**
   * Deactivate.
   */
  deactivate() {
    this.tab.setAttribute('tabindex', '-1');
    this.tab.setAttribute('aria-selected', 'false');

    this.buttonNext.deactivate();
    this.buttonPrevious.deactivate();  
  }

  /**
   * Blur.
   */
  blur() {
    this.tab.blur();
  }

  /**
   * Focus.
   */
  focus() {
    this.tab.focus();
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
      Dictionary.get(`a11y.currentSymbol`).replace(/@symbol/g, currentSymbol)
    ]);
    this.buttonPrevious.setAriaLabel([
      Dictionary.get('a11y.previousSymbol'),
      Dictionary.get(`a11y.currentSymbol`).replace(/@symbol/g, currentSymbol)
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
      Dictionary.get(`a11y.disabled`)
    ]);
    this.buttonNext.setAriaLabel([
      Dictionary.get('a11y.previousSymbol'),
      Dictionary.get(`a11y.disabled`)
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
      Dictionary.get(`a11y.disabled`) :
      Dictionary.get(`a11y.currentSymbol`).replace(/@symbol/g, currentSymbol);

    this.buttonNext.setAriaLabel([
      Dictionary.get('a11y.nextSymbol'),
      buttonSymbol
    ]);

    this.buttonPrevious.setAriaLabel([
      Dictionary.get('a11y.previousSymbol'),
      buttonSymbol
    ]);

    this.tab.setAttribute('aria-label', currentSymbol);
  }

  /**
   * Handle segment keydown.
   *
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeydown(event) {
    let propagate = true;

    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(event.key) !== -1) {
      this.callbacks.onKeydown(event.key);
      propagate = false;
    }
    else if (
      !this.isDisabled &&
      ['ArrowUp', 'ArrowDown'].indexOf(event.key) !== -1
    ) {
      // Amendmend of aria tab scheme
      this.callbacks.onKeydown(event.key);
      propagate = false;      
    }

    if (!propagate) {
      event.stopPropagation();
      event.preventDefault();
    }
  }

  /**
   * Change to next symbol.
   */
  changeToNextSymbol() {
    this.changeSymbol(
      (this.position + this.params.alphabet.length - 1) %
        this.params.alphabet.length
    );    
  }

  /**
   * Change to previous symbol.
   */
  changeToPreviousSymbol() {
    this.changeSymbol(
      (this.position + 1) % this.params.alphabet.length
    );    
  }

  /**
   * Change symbol.
   *
   * @param {number} position New position.
   */
  changeSymbol(position) {
    this.setPosition(position);
    this.callbacks.onChanged();

    if (this.isDisabled) {
      return;
    }

    this.cooldown();
  }

  /**
   * Cooldown.
   */
  cooldown() {
    if (this.isCoolingDown) {
      return;
    }
    this.isCoolingDown = true;

    this.buttonPrevious.disable();
    this.buttonNext.disable();

    clearTimeout(this.cooldownTimeout);
    this.cooldownTimeout = setTimeout(() => {     
      this.buttonPrevious.enable();
      this.buttonNext.enable();
      this.isCoolingDown = false;
    }, LockSegment.COOLDOWN_TIMEOUT_MS);
  }
}

/** @constant {number} COOLDOWN_TIMEOUT_MS Cooldown timeout in ms */
LockSegment.COOLDOWN_TIMEOUT_MS = 275;