'use strict';

var multimatch = require('multimatch'),
    findup = require('findup-sync'),
    path = require('path');


/**
 * parent module's directory to find package.json
 * @type {String}
 */
var parentDir = path.dirname(module.parent.filename);
// necessary to get the current `module.parent` and resolve paths correctly.
delete require.cache[__filename];


/**
 * export main function
 * @param  {mixed}  options  custom options object or options.prefix string
 * @return {Object}          object containing requires
 */
module.exports = function(options) {

    var defaultOptions = {
            prefix: 'gulp',
            pattern: null,
            replaceExpr: null,
            scope: ['dependencies', 'devDependencies', 'peerDependencies'],
            config: findup('package.json', {cwd: parentDir}),
            requireFn: require,
            camelize: true,
            lazy: true,
            rename: {}
        },
        container = {},
        names;

    options = parseOptions(options, defaultOptions);

    names = options.scope.reduce(function(result, prop) {
        return result.concat(Object.keys(options.config[prop] || {}));
    }, []);

    multimatch(names, options.pattern).forEach(function(name) {
        var requireName;
        if (options.rename[name]) {
            requireName = options.rename[name];
        }
        else {
            requireName = name.replace(options.replaceExp, '');
            requireName = options.camelize ? camelize(requireName) : requireName;
        }
        if (options.lazy) {
            Object.defineProperty(container, requireName, {
                get: function() {
                    return options.requireFn(name);
                }
            });
        }
        else {
            container[requireName] = options.requireFn(name);
        }
    });

    return container;

};


/**
 * creates a valid options object from custom options and default options
 * @param  {mixed}  options        custom options object or options.prefix string
 * @param  {Object} defaultOptions default options object
 * @return {Object}                merged and validated options object
 */
function parseOptions(options, defaultOptions) {
    options = isType('String', options) ?
        { prefix: options } : (isType('Object', options) ? options : {});
    options.prefix = isType('String', options.prefix) ?
        options.prefix : defaultOptions.prefix;
    options.pattern = isType('String', options.pattern, true) ?
        arrayify(options.pattern) : [options.prefix + '-*', options.prefix + '.*'];
    options.replaceExp = isType('RegExp', options.replaceExp) ?
        options.replaceExp : new RegExp('^' + options.prefix + '(-|\\.)');
    options.scope = isType('String', options.scope, true) ?
        arrayify(options.scope) : defaultOptions.scope;
    options.config = (isType('String', options.config) || isType('Object', options.config)) ?
        options.config : defaultOptions.config;
    options.requireFn = isType('Function', options.requireFn) ?
        options.requireFn : defaultOptions.requireFn;
    options.camelize = isType('Boolean', options.camelize) ?
        options.camelize : defaultOptions.camelize;
    options.lazy = isType('Boolean', options.lazy) ?
        options.lazy : defaultOptions.lazy;
    options.rename = isType('Object', options.rename) ?
        options.rename : defaultOptions.rename;
    if (isType('String', options.config)) {
        options.config = require(options.config);
    }
    if (!isType('Object', options.config)) {
        throw new Error('Could not find dependencies. Do you have a package.json file in your project?');
    }
    options.pattern.push('!auto-plug');
    return options;
}


/**
 * if item is no array, put it in an array
 * @param  {mixed} item
 * @return {Array}
 */
function arrayify(item) {
    return isType('Array', item) ? item : [item];
}


/**
 * transform string to camelcase
 * @param  {String} str
 * @return {String}
 */
function camelize(str) {
    return str.replace(/-(\w)/g, function(m, p1) {
        return p1.toUpperCase();
    });
}


/**
 * test if an item is an object of given type or an array of same type (if allowArrayOfType is true)
 * @param  {String}  type
 * @param  {mixed}   item
 * @param  {Boolean} allowArrayOfType
 * @return {Boolean}                   result
 */
function isType(type, item, allowArrayOfType) {
    var testType = function(obj) {
        return Object.prototype.toString.call(obj) === '[object ' + type + ']';
    };
    if (allowArrayOfType && Object.prototype.toString.call(item) === '[object Array]') {
        return item.every(testType);
    }
    return testType(item);
}
