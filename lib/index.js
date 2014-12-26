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
    options = new Options(options).getPlainObject();
    var container = {},
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

/**
 * Options class for merging and validating custom options with default options
 * @param {mixed} options custom options
 */
function Options(options) {
    this.options = isType('String', options) ?
        { prefix: options } : (isType('Object', options) ? options : {});
    Object.keys(this.getDefinitions()).forEach(function(property) {
        this.validateProperty(property);
    }.bind(this));
}

/**
 * creates definitions of option properties
 * @return {Object} property definitions
 */
Options.prototype.getDefinitions = function(property) {
    var definitions = {
        prefix: {
            type: 'String',
            default: 'gulp'
        },
        pattern: {
            type: 'String',
            allowArrayOfType: true,
            getDefault: function() {
                return [this.options.prefix + '-*', this.options.prefix + '.*'];
            }.bind(this),
            after: function() {
                this.options.pattern.push('!auto-plug');
            }.bind(this)
        },
        replaceExp: {
            type: 'RegExp',
            getDefault: function() {
                return new RegExp('^' + this.options.prefix + '(-|\\.)');
            }.bind(this)
        },
        config: {
            type: ['String', 'Object'],
            getDefault: function() {
                return findup('package.json', {cwd: parentDir});
            }.bind(this),
            after: function() {
                if (isType('String', this.options.config)) {
                    this.options.config = require(this.options.config);
                }
                if (!isType('Object', this.options.config)) {
                    throw new Error('Could not find dependencies. Do you have a package.json file in your project?');
                }
            }.bind(this)
        },
        scope: {
            type: 'String',
            allowArrayOfType: true,
            default: ['dependencies', 'devDependencies', 'peerDependencies']
        },
        requireFn: {
            type: 'Function',
            default: require
        },
        camelize: {
            type: 'Boolean',
            default: true
        },
        lazy: {
            type: 'Boolean',
            default: true
        },
        rename: {
            type: 'Object',
            default:  {}
        }
    };
    return definitions.hasOwnProperty(property) ? definitions[property] : definitions;
};

/**
 * returns plain object of options
 * @return {Object} options
 */
Options.prototype.getPlainObject = function() {
    return this.options;
};

/**
 * validates a property according to its definition
 * @param  {String}  property  property name
 * @return {Options}
 */
Options.prototype.validateProperty = function(property) {
    var definition = this.getDefinitions(property);
    if (this.propertyHasValidType(property)) {
        this.options[property] = (definition.allowArrayOfType && !isType('Array', this.options[property]) ?
            [this.options[property]] : this.options[property]);
    }
    else {
        this.options[property] = isType('Function', definition.getDefault) ?
            definition.getDefault() : definition.default;
    }
    if (isType('Function', definition.after)) {
        definition.after();
    }
    return this;
};

/**
 * test if a property's type is valid
 * @param  {String} property   property name
 * @return {Boolean}           result
 */
Options.prototype.propertyHasValidType = function(property) {
    var definition = this.getDefinitions(property);
    if (isType('Array', definition.type)) {
        return definition.type.filter(function(item) {
                return isType(item, this.options[property], definition.allowArrayOfType || false);
            }.bind(this)).length === 1;
    }
    return isType(definition.type, this.options[property], definition.allowArrayOfType || false);
};
