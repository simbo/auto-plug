'use strict';

var arrayify = require('arrayify'),
    multimatch = require('multimatch'),
    findupSync = require('findup-sync'),
    Options = require('defined-options'),
    is = Options.is,
    path = require('path');

/**
 * option definitions passed to defined-options
 * @type {Object}
 */
var optionDefinitions = {
        camelize: {
            default: true,
            validate: 'boolean'
        },
        lazy: {
            default: true,
            validate: 'boolean'
        },
        rename: {
            default: {},
            validate: 'object'
        },
        scope: {
            default: ['dependencies', 'devDependencies'],
            validate: ['string', 'string[]'],
            filter: arrayify
        },
        module: {
            default: module.parent.parent,
            validate: 'object'
        },
        config: {
            default: function() {
                var pkgJson = findupSync('package.json', {
                        cwd: path.dirname(this.options.module.filename)
                    });
                return pkgJson;
            },
            validate: ['string', 'object'],
            filter: function(value) {
                if (is('string', value)) {
                    value = require(value);
                }
                return value;
            }
        },
        requireFn: {
            default: function() {
                return this.options.module.require.bind(this.options.module);
            },
            validate: 'function'
        },
        prefix: {
            validate: function(value) {
                return (is('string!empty', value)) ||
                    (this.options.validate('pattern') && this.options.validate('replaceExp'));
            }
        },
        pattern: {
            default: function() {
                return this.options.prefix ?
                    [this.options.prefix + '-*', this.options.prefix + '.*'] : undefined;
            },
            validate: ['string', 'string[]'],
            filter: function(value) {
                return arrayify(value).concat('!auto-plug');
            }
        },
        replaceExp: {
            default: function() {
                return this.options.prefix ?
                    new RegExp('^' + this.options.prefix + '([\.-])') : undefined;
            },
            validate: 'regexp'
        }
    };

/**
 * AutoPlug Class
 *
 * @param {mixed} options  custom options object or options.prefix string
 */
function AutoPlug(options) {
    this.setOptions(options);
}

/**
 * sets/updates options
 *
 * @param {object} options  new option values
 * @return {AutoPlug} this
 */
AutoPlug.prototype.setOptions = function(options) {
    options = is('string', options) ?
        {prefix: options} : (is('object', options) ? options : {});

    // if no options are set, set default options
    if (!this.hasOwnProperty('options')) {
        this.options = new Options(optionDefinitions);
    }

    // merge current options with given options
    this.options.merge(options);

    // if a valid relative option is given, reset its related options values, if
    // no valid values are given for them
    var optionRelations = {
            module: ['config', 'requireFn'],
            prefix: ['pattern', 'replaceExp']
        };
    Object.keys(optionRelations).forEach(function(relative) {
        if (this.options.validate(relative, options[relative])) {
            optionRelations[relative].forEach(function(heir) {
                if (!options.hasOwnProperty(heir) || !this.options.validate(heir, options[heir])){
                    this.options.default(heir);
                }
            }.bind(this));
        }
    }.bind(this));

    // throw an error if options are not valid
    if (!this.options.validate()) {
        throw new Error(
            'AutoPlug options are not valid: ' +
            Object.keys(this.options).reduce(function(invalidOptions, optionName) {
                if (!this.options.validate(optionName)) {
                    invalidOptions.push(optionName);
                }
                return invalidOptions;
            }.bind(this), []).join(', ')
        );
    }

    return this;
};

/**
 * creates the container object with requires
 *
 * @return {AutoPlug} this
 */
AutoPlug.prototype.plug = function() {
    this.container = {};
    multimatch(this.options.scope.reduce(function(result, prop) {
        return result.concat(Object.keys(this.options.config[prop] || {}));
    }.bind(this), []), this.options.pattern).forEach(this.addPackageToContainer.bind(this));
    return this;
};

/**
 * adds a package to the container object
 *
 * @param {String} pkgName  package name to require
 */
AutoPlug.prototype.addPackageToContainer = function(pkgName) {
    var requireName = getRequireNameForPackage.call(this, pkgName);
    if (this.options.lazy) {
        Object.defineProperty(this.container, requireName, {
            enumerable: true,
            get: function() {
                return this.options.requireFn(pkgName);
            }.bind(this)
        });
    } else {
        this.container[requireName] = this.options.requireFn(pkgName);
    }
};

/**
 * returns container object
 *
 * @return {Object}
 */
AutoPlug.prototype.getContainer = function() {
    return this.container;
};

/**
 * returns a filtered name for a require container property
 *
 * @param  {String} pkgName  original package name
 * @return {String}          filtered name
 */
function getRequireNameForPackage(pkgName) {
    if (this.options.rename[pkgName]) {
        return this.options.rename[pkgName];
    }
    var requireName = pkgName.replace(this.options.replaceExp, '');
    return this.options.camelize ? camelize(requireName) : requireName;
};

/**
 * transform dashed string to camelcase
 *
 * @param  {String} str
 * @return {String}
 */
function camelize(str) {
    return str.replace(/-(\w)/g, function(m, p1) {
        return p1.toUpperCase();
    });
}

/**
 * export AutoPlug
 *
 * @type {class}
 */
module.exports = AutoPlug;
