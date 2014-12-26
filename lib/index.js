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
    var autoPlug = new AutoPlug(options);
    return autoPlug.getContainer();
};

function AutoPlug(options) {
    this.validateOptions(isType('String', options) ? { prefix: options } : options)
        .setPackagesToRequire()
        .plug();
}

AutoPlug.prototype.plug = function(pkgNames) {
    this.container = {};
    this.pkgNames.forEach(function(pkgName) {
        var requireName = this.getRequireNameForPackage(pkgName);
        if (this.options.lazy) {
            Object.defineProperty(this.container, requireName, {
                get: function() {
                    return this.options.requireFn(pkgName);
                }.bind(this)
            });
        }
        else {
            this.container[requireName] = this.options.requireFn(pkgName);
        }
    }.bind(this));
    return this;
};

AutoPlug.prototype.getContainer = function() {
    return this.container;
};

AutoPlug.prototype.setPackagesToRequire = function() {
    this.pkgNames = multimatch(this.options.scope.reduce(function(result, prop) {
        return result.concat(Object.keys(this.options.config[prop] || {}));
    }.bind(this), []), this.options.pattern);
    return this;
};

AutoPlug.prototype.getRequireNameForPackage = function(pkgName) {
    if (this.options.rename[pkgName]) {
        return this.options.rename[pkgName];
    }
    var requireName = pkgName.replace(this.options.replaceExp, '');
    return this.options.camelize ? camelize(requireName) : requireName;
};

AutoPlug.prototype.defaultOptions = {
    prefix: 'gulp',
    scope: ['dependencies', 'devDependencies', 'peerDependencies'],
    requireFn: require,
    camelize: true,
    lazy: true,
    rename: {}
};

AutoPlug.prototype.optionsProperties = {
    prefix: { type: 'String' },
    scope: { type: 'String', arrayify: true },
    requireFn: { type: 'Function' },
    camelize: { type: 'Boolean' },
    lazy: { type: 'Boolean' },
    rename: { type: 'Object' }
};

AutoPlug.prototype.validateOptions = function(options) {
    this.options = (isType('Object', options) ? options : {});
    Object.keys(this.optionsProperties).forEach(function(property) {
        if (!isType(this.optionsProperties[property], this.options[property])) {
            this.options[property] = this.defaultOptions[property];
        }
        if (this.optionsProperties[property].hasOwnProperty('arrayify') && this.optionsProperties[property].arrayify===true && !isType('Array', this.options[property])) {
            this.options[property] = [this.options[property]];
        }
    }.bind(this));
    return this.validatePattern().validateReplaceExp().validateConfig();
}

AutoPlug.prototype.validatePattern = function() {
    if (!isType('String', this.options.pattern, true)) {
        this.options.pattern = [this.options.prefix + '-*', this.options.prefix + '.*'];
    }
    if (!isType('Array', this.options.pattern)) {
        this.options.pattern = [this.options.pattern];
    }
    this.options.pattern.push('!auto-plug');
    return this;
}

AutoPlug.prototype.validateReplaceExp = function() {
    if (!isType('RegExp', this.options.replaceExp)) {
        this.options.replaceExp = new RegExp('^' + this.options.prefix + '(-|\\.)');
    }
    return this;
}

AutoPlug.prototype.validateConfig = function(options) {
    if (!isType('String', this.options.config) && !isType('Object', this.options.config)) {
        this.options.config = findup('package.json', {cwd: parentDir});
    }
    if (isType('String', this.options.config)) {
        this.options.config = require(this.options.config);
    }
    if (!isType('Object', this.options.config)) {
        throw new Error('Could not find dependencies. Do you have a package.json file in your project?');
    }
    return this;
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
