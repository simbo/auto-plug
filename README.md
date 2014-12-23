auto-plug
=========

  > Auto-require plugins packages by prefix. (for i.e. Gulp, Grunt or other
  > heavy plugin-dependant packages)

[![npm Package Version](https://img.shields.io/npm/v/auto-plug.svg?style=flat-square)](https://www.npmjs.com/package/auto-plug)
[![MIT License](http://img.shields.io/:license-mit-blue.svg?style=flat-square)](http://simbo.mit-license.org)
[![Dependencies Status](https://img.shields.io/david/simbo/auto-plug.svg?style=flat-square)](https://david-dm.org/simbo/auto-plug)
[![devDependencies Status](https://img.shields.io/david/dev/simbo/auto-plug.svg?style=flat-square)](https://david-dm.org/simbo/auto-plug#info=devDependencies)
[![Travis Build Status](https://img.shields.io/travis/simbo/auto-plug/master.svg?style=flat-square)](https://travis-ci.org/simbo/auto-plug)
[![Code Climate GPA](https://img.shields.io/codeclimate/github/simbo/auto-plug.svg?style=flat-square)](https://codeclimate.com/github/simbo/auto-plug)
[![Code Climate Test Coverage](https://img.shields.io/codeclimate/coverage/github/simbo/auto-plug.svg?style=flat-square)](https://codeclimate.com/github/simbo/auto-plug)


## Install

``` bash
$ npm install auto-plug
```


## Usage

***auto-plug*** will return a object containing the required module exports. If your config data contains package names like `foo-this` and `foo-that`, they can be autoloaded by passing the prefix `foo` and after that accessed by `plugins.this()`or `plugins.that()`.

You can do this:

``` javascript
var plugins = require('auto-plug')('myprefix');
```

or that:

``` javascript
var plugins = require('auto-plug')({ OPTIONS });
```

and of course also this:

``` javascript
var autoPlug = require('auto-plug'),
    fooPlugins = autoPlug('foo'),
    barPlugins = autoPlug('bar');
```


### with Gulp

As `gulp` is the default value for the option `prefix`, you don't have to pass any options when using gulp:

``` javascript
// Gulpfile.js
var gulp = require('gulp'),
    gulpPlugins = require('auto-plug')();
gulp.task('default', function() {
    return gulp
        .src('some/glob')
        .pipe(gulpPlugins.someGulpThing())
        .pipe(gulpPlugins.someOtherGulpThing())
        // ...
    }
});
```


### with Grunt

Grunt needs it's own require function:

``` javascript
// Gruntfile.js
module.exports = function (grunt) {
    require('auto-plug')({ prefix: 'grunt', require: grunt.loadNpmTasks });
    // do grunt things as usual
}
```


### with any other thing,...

... i.e. with [Metalsmith](https://github.com/segmentio/metalsmith):

``` javascript
var metalsmith = require('metalsmith')
    metalsmithPlugins = require('auto-plug')('metalsmith');

    Metalsmith
        .source('.')
        .use(metalsmithPlugins.someMetalsmithThing())
        .use(metalsmithPlugins.someOtherMetalsmithThing())
        .build();
```


## Options

All options are optional.

  - `prefix` - (default: `gulp`)  
    can be used to quickly define `pattern` and `replaceExpr` at once (see [default options](#default-options))

  - `pattern` - (default: `[prefix + '-*', prefix + '.*']`)  
    a globbing pattern to find packages in config for require

  - `replaceExpr` - (default: `new RegExp('^' + prefix + '(-|\\.)')`)  
    a regular expression for what shall be removed from a package name when adding to container object

  - `scope` - (default: `['dependencies', 'devDependencies', 'peerDependencies']`)  
    which keys in config opject contain packages to require

  - `config` - (default: current package's package.json data)  
    the config where auto-plug will look for packages to require; can be a plain object or a string containing a path to require

  - `requireFn` - (default: `require`)  
    the function to be used for requiring packages

  - `camelize` - (default: `true`)  
    whether package names should be converted to camelcase when adding to container object or not

  - `lazy` - (default: `true`)  
    whether packages should be lazy-loaded (loaded when called for the first time) or when calling auto-plug

  - `rename` - (default: `{}`)  
    a plain object for custom renaming; keys should contain original package names and values the rename string


### Default options

```javascript
{
    prefix: 'gulp',
    pattern: [prefix + '-*', prefix + '.*'],
    replaceExpr: new RegExp('^' + prefix + '(-|\\.)'),
    scope: ['dependencies', 'devDependencies', 'peerDependencies'],
    config: findup('package.json', {cwd: parentDir}),
    requireFn: require,
    camelize: true,
    lazy: true,
    rename: {}
}
```
