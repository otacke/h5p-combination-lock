/** Class for utility functions */
export default class Util {
  /**
   * Extend an array just like JQuery's extend.
   *
   * @returns {object} Merged objects.
   */
  static extend() {
    for (let i = 1; i < arguments.length; i++) {
      for (let key in arguments[i]) {
        if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
          if (typeof arguments[0][key] === 'object' && typeof arguments[i][key] === 'object') {
            this.extend(arguments[0][key], arguments[i][key]);
          }
          else {
            arguments[0][key] = arguments[i][key];
          }
        }
      }
    }
    return arguments[0];
  }

  /**
   * Retrieve string without HTML tags.
   *
   * @param {string} html Input string.
   * @returns {string} Output string.
   */
  static stripHTML(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  /**
   * Format language tag (RFC 5646). Assuming "language-coutry". No validation.
   * Cmp. https://tools.ietf.org/html/rfc5646
   *
   * @param {string} languageCode Language tag.
   * @returns {string} Formatted language tag.
   */
  static formatLanguageCode(languageCode) {
    if (typeof languageCode !== 'string') {
      return languageCode;
    }

    /*
     * RFC 5646 states that language tags are case insensitive, but
     * recommendations may be followed to improve human interpretation
     */
    const segments = languageCode.split('-');
    segments[0] = segments[0].toLowerCase(); // ISO 639 recommendation
    if (segments.length > 1) {
      segments[1] = segments[1].toUpperCase(); // ISO 3166-1 recommendation
    }
    languageCode = segments.join('-');

    return languageCode;
  }

  /**
   * Add mixins to a class, useful for splitting files.
   *
   * @param {object} [master={}] Master class to add mixins to.
   * @param {object[]|object} [mixins=[]] Mixins to be added to master.
   */
  static addMixins(master = {}, mixins = []) {
    if (!master.prototype) {
      return;
    }

    if (!Array.isArray(mixins)) {
      mixins = [mixins];
    }

    const masterPrototype = master.prototype;

    mixins.forEach((mixin) => {
      const mixinPrototype = mixin.prototype;
      Object.getOwnPropertyNames(mixinPrototype).forEach((property) => {
        if (property === 'constructor') {
          return; // Don't need constructor
        }

        if (Object.getOwnPropertyNames(masterPrototype).includes(property)) {
          return; // property already present, do not override
        }

        masterPrototype[property] = mixinPrototype[property];
      });
    });
  }
}
