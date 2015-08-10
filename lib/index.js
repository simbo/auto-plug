'use strict';

var multimatch = require('multimatch'),
    findup = require('findup-sync'),
    path = require('path');


/**
 * parent module's directory to find package.json
 * @type {String}
 */
var parentDir = path.dirname(module.parent.filename);


/**
 * AutoPlug Class
 *
 * @param {mixed} options  custom options object or options.prefix string
 */
function AutoPlug(options) {
    this.validateOptions(isType('String', options) ? {prefix: options} : options)
        .plug();
}


/**
 * properties of AutoPlug options for validation
 * @type {Object}
 */
AutoPlug.prototype.optionsProperties = {
    prefix: {
        default: '',
        type: 'String'
    },
    scope: {
        default: ['dependencies', 'devDependencies'],
        type: 'String',
        arrayify: true
    },
    requireFn: {
        default: require,
        type: 'Function'
    },
    camelize: {
        default: true,
        type: 'Boolean'
    },
    lazy: {
        default: true,
        type: 'Boolean'
    },
    rename: {
        default: {},
        type: 'Object'
    },
    pattern: {
        type: 'String',
        arrayify: true,
        getDefault: function() {
            return [this.options.prefix + '-*', this.options.prefix + '.*'];
        },
        after: function() {
            this.options.pattern.push('!auto-plug');
        }
    },
    replaceExp: {
        type: 'RegExp',
        getDefault: function() {
            return new RegExp('^' + this.options.prefix + '(-|\\.)');
        }
    },
    config: {
        type: ['String', 'Object'],
        getDefault: function() {
            return findup('package.json', {cwd: parentDir});
        },
        after: function() {
            this.retrieveAndValidateConfigData();
        }
    }
};


/**
 * sets the container object with requires
 *
 * @return {AutoPlug} this
 */
AutoPlug.prototype.plug = function() {
    this.container = {};
    this.setPackagesToRequire();
    this.pkgNames.forEach(this.addPackageToContainer.bind(this));
    return this;
};


/**
 * sets packages to require according to config, scope and pattern
 *
 * @return {AutoPlug} this
 */
AutoPlug.prototype.setPackagesToRequire = function() {
    this.pkgNames = multimatch(this.options.scope.reduce(function(result, prop) {
        return result.concat(Object.keys(this.options.config[prop] || {}));
    }.bind(this), []), this.options.pattern);
    return this;
};


/**
 * adds a package to the container object
 *
 * @param {String} pkgName  package name to require
 */
AutoPlug.prototype.addPackageToContainer = function(pkgName) {
    var requireName = this.getRequireNameForPackage(pkgName);
    if (this.options.lazy) {
        Object.defineProperty(this.container, requireName, {
            get: function() {
                return this.options.requireFn(pkgName);
            }.bind(this)
        });
    } else {
        this.container[requireName] = this.options.requireFn(pkgName);
    }
};


/**
 * returns container object with requires
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
AutoPlug.prototype.getRequireNameForPackage = function(pkgName) {
    if (this.options.rename[pkgName]) {
        return this.options.rename[pkgName];
    }
    var requireName = pkgName.replace(this.options.replaceExp, '');
    return this.options.camelize ? camelize(requireName) : requireName;
};


/**
 * validate custom options according to option properties
 *
 * @param  {Object}   options  custom options
 * @return {AutoPlug}          this
 */
AutoPlug.prototype.validateOptions = function(options) {
    this.options = (isType('Object', options) ? options : {});
    this.testOptions();
    Object.keys(this.optionsProperties).forEach(function(propertyName) {
        var properties = this.optionsProperties[propertyName],
            validType = arrayify(properties.type).filter(function(type) {
                return isType(type, this.options[propertyName], properties.arrayify ? true : false);
            }.bind(this)).length === 1;
        if (!validType) {
            this.options[propertyName] = properties.hasOwnProperty('getDefault') ?
                properties.getDefault.bind(this)() : properties.default;
        }
        if (properties.arrayify) {
            this.options[propertyName] = arrayify(this.options[propertyName]);
        }
        if (properties.hasOwnProperty('after')) {
            properties.after.bind(this)();
        }
    }.bind(this));
    return this;
};

/**
 * test if given options are valid
 *
 * @return {AutoPlug} this
 */
AutoPlug.prototype.testOptions = function() {
    if (
        (this.options.hasOwnProperty('prefix') && (this.options.prefix === '' || !isType('String', this.options.prefix))) ||
        (!this.options.hasOwnProperty('prefix') &&
            (!this.options.hasOwnProperty('replaceExp') || !this.options.hasOwnProperty('pattern') ||
            !(isType('RegExp', this.options.replaceExp) && isType('String', this.options.pattern, true)))
        )
    ) {
        throw new Error('Neither a prefix option is set, nor replaceExp or pattern options are valid.');
    }
};


/**
 * retrieve config data from given path or die
 *
 * @return {AutoPlug} this
 */
AutoPlug.prototype.retrieveAndValidateConfigData = function() {
    if (isType('String', this.options.config)) {
        try {
            this.options.config = require(this.options.config);
        }
        catch (err) {
            throw new Error('Could not require given config file: \'' + this.options.config + '\'');
        }
    }
    if (!isType('Object', this.options.config)) {
        throw new Error('Could not find dependencies. Do you have a package.json file in your project?');
    }
    return this;
};


/**
 * if item is no array, put it in an array
 *
 * @param  {mixed} item
 * @return {Array}
 */
function arrayify(item) {
    return isType('Array', item) ? item : [item];
}


/**
 * transform string to camelcase
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
 * test if an item is an object of given type or an array of same type (if allowArrayOfType is true)
 *
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
 * export main function
 *
 * @param  {mixed}  options  custom options object or options.prefix string
 * @return {Object}          object containing requires
 */
module.exports = function(options) {
    var autoPlug = new AutoPlug(options);
    return autoPlug.getContainer();
};

// necessary to get the current `module.parent` and resolve paths correctly.
delete require.cache[__filename];
