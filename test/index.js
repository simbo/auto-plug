'use strict';

var assert = require('assert'),
    sinon = require('sinon');

var autoPlug = (function() {
    var wrapInFunc = function(value) {
        return function() {
            return value;
        };
    };
    var proxyquire = require('proxyquire').noCallThru();

    /* Ensure that our fixture won't be able to findup() */
    function noFindUp() { return null; }
    noFindUp['@global'] = true;

    /* Load a dummy module whose require() will have these results,
       and return an auto-plug function customized for that module
     */
    return proxyquire('../fixtures/auto-plug.js', {
            'bob-foo': wrapInFunc({name: 'foo'}),
            'bob-bar': wrapInFunc({name: 'bar'}),
            'bob-foo-bar': wrapInFunc({name: 'foo-bar'}),
            'jack-foo': wrapInFunc({name: 'jack-foo'}),
            'bob-insert': {
                'append':  wrapInFunc({name: 'insert.append'}),
                'wrap':   wrapInFunc({name: 'insert.wrap'})
            },
            'bob.baz': wrapInFunc({name: 'baz'}),
            'findup-sync': noFindUp
        });
})();

describe('auto-plug', function() {

    it('should find parent package\'s package.json and return a plain object', function() {
        assert.deepEqual(
            {sync:require('findup-sync')}, require('..')('findup')
        );
    });

    it('should allow setting the module to get default requireFn from', function() {
        assert.throws(function() {
            autoPlug({
                prefix: 'jack',
                lazy: false,
                // use our require, so it will fail loading jack-foo
                module: module, 
                config:{'dependencies':{'jack-foo': '*'}}
            });
        }, /Cannot find module 'jack-foo'/);
    });

    it('should allow setting the module to get default config from', function() {
        var ap =  require('..')({
            prefix: 'jack', lazy: false, module: autoPlug.module
        });
        assert.deepEqual({name: 'jack-foo'}, ap.foo());
    });


    it('should throw an error if it can\'t find a package.json', function() {
        assert.throws(function() {
            autoPlug('bob');
        }, /Could not find dependencies. Do you have a package.json file in your project?/);
    });

    it('should throw an error if it can\'t find given config file', function() {
        assert.throws(function() {
            autoPlug({
                prefix: 'bob',
                config: 'this/path/does/not/exist.json'
            });
        }, /Could not require given config file: 'this\/path\/does\/not\/exist.json'/);
    });

    it('should throw an error if neither prefix nor pattern and replaceExp options are set', function() {
        assert.throws(function() {
            autoPlug();
        }, / Neither a prefix option is set, nor replaceExp or pattern options are valid./);
    });

    it('should throw an error if neither a prefix option is set nor pattern and replaceExp options are valid', function() {
        assert.throws(function() {
            autoPlug({
                pattern: true,
                replaceExp: true
            });
        }, / Neither a prefix option is set, nor replaceExp or pattern options are valid./);
    });

    it('should accept a single string as quick configuration', function() {
        var ap = require('..')('findup');
        assert('[Function]', Object.prototype.toString.call(ap.sync));
    });

});

var commonTests = function(lazy) {

    it('should automagically load packages as defined', function() {
        var ap = autoPlug({
            prefix: 'bob',
            lazy: lazy,
            config: {
                dependencies: {
                    'bob-foo': '1.0.0',
                    'bob-bar': '*',
                    'bob-insert': '*',
                    'bob.baz': '*'
                }
            }
        });

        assert.deepEqual(
            Object.keys(ap), ['foo', 'bar', 'insert', 'baz']
        );
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
                    'bob-bar': '*'
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
                    'bob-bar': '*'
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
            prefix: 'bob',
            lazy: lazy,
            camelize: false,
            config: {
                dependencies: {
                    'bob-foo-bar': '*'
                }
            }
        });
        assert.deepEqual(ap['foo-bar'](), {
            name: 'foo-bar'
        });
    });

    it('should camelize plugin names by default', function() {
        var ap = autoPlug({
            prefix: 'bob',
            lazy: lazy,
            config: {
                dependencies: {
                    'bob-foo-bar': '*'
                }
            }
        });
        assert.deepEqual(ap.fooBar(), {
            name: 'foo-bar'
        });
    });

    it('should allow something to be completely renamed', function() {
        var ap = autoPlug({
            prefix: 'bob',
            lazy: lazy,
            config: {
                dependencies: {
                    'bob-foo': '1.0.0'
                }
            },
            rename: {
                'bob-foo': 'bar'
            }
        });
        assert.deepEqual(ap.bar(), {
            name: 'foo'
        });
    });

    it('should allow a scope override', function() {
        var ap = autoPlug({
            prefix: 'bob',
            lazy: lazy,
            config: {
                dependencies: {
                    'bob-foo': '1.0.0'
                },
                devDependencies: {
                    'bob-foo-bar': '1.0.0'
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
            prefix: 'bob',
            lazy: false,
            config: {
                dependencies: {
                    'bob-insert': '*'
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
            prefix: 'bob',
            lazy: true,
            config: {
                dependencies: {
                    'bob-insert': '*'
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
