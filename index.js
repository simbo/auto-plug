'use strict';

var AutoPlug = require('./lib/auto-plug.js');

/**
 * export main function
 * @param  {mixed}  options  custom options object or options.prefix string
 * @return {Object}          object containing requires
 */
module.exports = function(options) {
    var autoPlug = new AutoPlug(options);
    return autoPlug.getContainer();
};

/**
 * export AutoPlug
 * @type {class}
 */
module.exports.AutoPlug = AutoPlug;
