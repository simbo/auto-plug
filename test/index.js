
var assert = require('assert'),
    sinon = require('sinon');

var autoPlug = (function() {
    var wrapInFunc = function(value) {
        return function() {
            return value;
        };
    };
    var proxyquire = require('proxyquire').noCallThru();
    return proxyquire('..', {
            'gulp-foo': wrapInFunc({ name: 'foo' }),
            'gulp-bar': wrapInFunc({ name: 'bar' }),
            'gulp-foo-bar': wrapInFunc({ name: 'foo-bar' }),
            'jack-foo': wrapInFunc({ name: 'jack-foo' }),
            'gulp-insert': {
                'append':  wrapInFunc({ name: 'insert.append' }),
                'wrap':   wrapInFunc({ name: 'insert.wrap' })
            },
            'gulp.baz': wrapInFunc({ name: 'baz' }),
            'findup-sync': function() { return null; }
        });
})();

describe('auto-plug', function() {

    it('should find its package\'s package.json and return a plain object', function() {
        assert({}, require('..')());
    });

    it('should throw an error if it can\'t find a package.json', function() {
        assert.throws(function() {
            autoPlug()
        }, /Could not find dependencies. Do you have a package.json file in your project?/);
    });

    it('should throw an error if it can\'t find given config file', function() {
        assert.throws(function() {
            autoPlug({ config: 'this-can-not-be-found.json' })
        }, /Cannot find module 'this-can-not-be-found.json'/);
    });

    it('should accept a single string as quick configuration', function() {
        var ap = require('..')('findup');
        assert('[Function]', Object.prototype.toString.call(ap.sync));
    });

});

var commonTests = function(lazy) {

    it('should automagically load packages as defined', function() {
        var ap = autoPlug({
            lazy: lazy,
            config: {
                dependencies: {
                    'gulp-foo': '1.0.0',
                    'gulp-bar': '*',
                    'gulp-insert': '*',
                    'gulp.baz': '*'
                }
            }
        });

        assert.deepEqual(ap.foo(), {
            name: 'foo'
        });
        assert.deepEqual(ap.bar(), {
            name: 'bar'
        });
        assert.deepEqual(ap.baz(), {
            name: 'baz'
        });
        assert.deepEqual(ap.insert.wrap(), {
            name: 'insert.wrap'
        });
        assert.deepEqual(ap.insert.append(), {
            name: 'insert.append'
        });
    });

    it('should accept a plain object with prefix param as quick configuration', function() {
        var ap = autoPlug({
            lazy: lazy,
            prefix: 'jack',
            config: {
                dependencies: {
                    'jack-foo': '1.0.0',
                    'gulp-bar': '*'
                }
            }
        });
        assert.deepEqual(ap.foo(), {
            name: 'jack-foo'
        });
        assert(!ap.bar);
    });

    it('should accept a a pattern override', function() {
        var ap = autoPlug({
            lazy: lazy,
            pattern: 'jack-*',
            replaceExp: /^jack(-|\.)/,
            config: {
                dependencies: {
                    'jack-foo': '1.0.0',
                    'gulp-bar': '*'
                }
            }
        });
        assert.deepEqual(ap.foo(), {
            name: 'jack-foo'
        });
        assert(!ap.bar);
    });

    it('should allow camelizing to be turned off', function() {
        var ap = autoPlug({
            lazy: lazy,
            camelize: false,
            config: {
                dependencies: {
                    'gulp-foo-bar': '*'
                }
            }
        });
        assert.deepEqual(ap['foo-bar'](), {
            name: 'foo-bar'
        });
    });

    it('should camelize plugin names by default', function() {
        var ap = autoPlug({
            lazy: lazy,
            config: {
                dependencies: {
                    'gulp-foo-bar': '*'
                }
            }
        });
        assert.deepEqual(ap.fooBar(), {
            name: 'foo-bar'
        });
    });

    it('should allow something to be completely renamed', function() {
        var ap = autoPlug({
            lazy: lazy,
            config: {
                dependencies: {
                    'gulp-foo': '1.0.0'
                }
            },
            rename: {
                'gulp-foo': 'bar'
            }
        });
        assert.deepEqual(ap.bar(), {
            name: 'foo'
        });
    });

    it('should allow a scope override', function() {
        var ap = autoPlug({
            lazy: lazy,
            config: {
                dependencies: {
                    'gulp-foo': '1.0.0'
                },
                devDependencies: {
                    'gulp-foo-bar': '1.0.0'
                }
            },
            scope: ['dependencies', 'baz']
        });
        assert.deepEqual(ap.foo(), {
            name: 'foo'
        });
    });

};

describe('auto-plug (without lazy loading)', function() {
    commonTests(false);
    var ap, spy;
    before(function() {
        spy = sinon.spy();
        ap = autoPlug({
            lazy: false,
            config: {
                dependencies: {
                    'gulp-insert': '*'
                }
            },
            requireFn: function() {
                spy();
                return function() {};
            }
        });
    });
    it('should require at first', function() {
        assert(spy.called);
    });
});

describe('auto-plug (with lazy loading)', function() {
    commonTests(true);
    var ap, spy;
    before(function() {
        spy = sinon.spy();
        ap = autoPlug({
            lazy: true,
            config: {
                dependencies: {
                    'gulp-insert': '*'
                }
            },
            requireFn: function() {
                spy();
                return function() {};
            }
        });
    });
    it('should not require at first', function() {
        assert(!spy.called);
    });
    it('should require when the property is accessed', function() {
        ap.insert();
        assert(spy.called);
    });
});
