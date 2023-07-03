import Util from '@services/util';
import charRegex from 'char-regex';

/**
 * Mixin containing methods for xapi stuff.
 */
export default class XAPI {
  /**
   * Trigger xAPI event.
   * @param {string} verb Short id of the verb we want to trigger.
   */
  triggerXAPIEvent(verb) {
    const xAPIEvent = this.createXAPIEvent(verb);
    this.trigger(xAPIEvent);
  }

  /**
   * Create an xAPI event.
   * @param {string} verb Short id of the verb we want to trigger.
   * @returns {H5P.XAPIEvent} Event template.
   */
  createXAPIEvent(verb) {
    const xAPIEvent = this.createXAPIEventTemplate(verb);

    Util.extend(
      xAPIEvent.getVerifiedStatementValue(['object', 'definition']),
      this.getXAPIDefinition());

    if (verb === 'answered') {
      xAPIEvent.setScoredResult(
        this.getScore(), // Question Type Contract mixin
        this.getMaxScore(), // Question Type Contract mixin
        this,
        true,
        this.getScore() > 0 // No need to have full score, but lock opened
      );

      xAPIEvent.data.statement.result = Util.extend(
        {
          response: this.lock.getResponse().match(charRegex()).join('[,]')
        },
        xAPIEvent.data.statement.result || {}
      );
    }

    return xAPIEvent;
  }

  /**
   * Get the xAPI definition for the xAPI object.
   * @returns {object} XAPI definition.
   */
  getXAPIDefinition() {
    const definition = {};

    definition.name = {};
    definition.name[this.languageTag] = this.getTitle();
    // Fallback for h5p-php-reporting, expects en-US
    definition.name['en-US'] = definition.name[this.languageTag];

    definition.description = {};
    definition.description[this.languageTag] = this.getDescription();
    // Fallback for h5p-php-reporting, expects en-US
    definition.description['en-US'] = definition.description[this.languageTag];

    definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
    definition.interactionType = 'fill-in';

    definition.correctResponsesPattern = [
      this.params.solution
        .match(charRegex())
        .join('[,]')
    ];

    return definition;
  }

  /**
   * Get task title.
   * @returns {string} Title.
   */
  getTitle() {
    // H5P Core function: createTitle
    return H5P.createTitle(
      this.extras?.metadata?.title || XAPI.DEFAULT_DESCRIPTION
    );
  }

  /**
   * Get description.
   * Uses XAPI_PLACEHOLDER as defined by H5P Group for their reporting module.
   * @returns {string} Description.
   */
  getDescription() {
    const description = this.params.introduction ||
      `<p>${XAPI.DEFAULT_DESCRIPTION}</p>`;

    const placeholders = this.params.solution
      .match(charRegex())
      .map(() => XAPI.RESPONSE_PLACEHOLDER)
      .join(' ');

    return `${description}\n<p>${placeholders}</p>`;
  }
}

/** @constant {string} DEFAULT_DESCRIPTION Default description */
XAPI.DEFAULT_DESCRIPTION = 'Combination Lock';

/** @constant {string} RESPONSE_PLACEHOLDER Placholder for description */
XAPI.RESPONSE_PLACEHOLDER = '__________';
