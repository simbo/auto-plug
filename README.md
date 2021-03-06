auto-plug
=========

  > Auto-require plugin packages by prefix. (for i.e. [Gulp](https://github.com/gulpjs/gulp), [Grunt](https://github.com/gruntjs/grunt) or other
  > heavy plugin-dependent packages)

[![npm Package Version](https://img.shields.io/npm/v/auto-plug.svg?style=flat-square)](https://www.npmjs.com/package/auto-plug)
[![MIT License](http://img.shields.io/:license-mit-blue.svg?style=flat-square)](http://simbo.mit-license.org)
[![Travis Build Status](https://img.shields.io/travis/simbo/auto-plug/master.svg?style=flat-square)](https://travis-ci.org/simbo/auto-plug)
[![Code Climate GPA](https://img.shields.io/codeclimate/github/simbo/auto-plug.svg?style=flat-square)](https://codeclimate.com/github/simbo/auto-plug)
[![Code Climate Test Coverage](https://img.shields.io/codeclimate/coverage/github/simbo/auto-plug.svg?style=flat-square)](https://codeclimate.com/github/simbo/auto-plug)

[![Dependencies Status](https://img.shields.io/david/simbo/auto-plug.svg?style=flat-square)](https://david-dm.org/simbo/auto-plug)
[![devDependencies Status](https://img.shields.io/david/dev/simbo/auto-plug.svg?style=flat-square)](https://david-dm.org/simbo/auto-plug#info=devDependencies)

---


<!-- MarkdownTOC -->

- [Install](#install)
- [Usage](#usage)
    - [with Gulp](#with-gulp)
    - [with Grunt](#with-grunt)
    - [with any other thing](#with-any-other-thing)
    - [Tip](#tip)
- [Options](#options)
    - [Default options](#default-options)
- [API Usage](#api-usage)
- [License](#license)

<!-- /MarkdownTOC -->


## Install

``` bash
$ npm install auto-plug
```


## Usage

***auto-plug*** will return an object containing the required module exports. 
If your config data (package.json) contains package names like `foo-this` and
`foo-that`, they can be autoloaded by

``` javascript
var plugins = require('auto-plug')('foo')`
```

and then accessed by `plugins.this()`or `plugins.that()`.

Instead of a simple prefix string you can also set [custom options](#options):

``` javascript
var plugins = require('auto-plug')({ prefix: 'foo', lazy: false });
```


### with Gulp

Just set the prefix option to `gulp`:

``` javascript
// Gulpfile.js
var gulp = require('gulp'),
    gulpPlugins = require('auto-plug')('gulp');
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


### with any other thing

… i.e. with [Metalsmith](https://github.com/segmentio/metalsmith):

``` javascript
var metalsmith = require('metalsmith')
    metalsmithPlugins = require('auto-plug')('metalsmith');

    Metalsmith
        .source('.')
        .use(metalsmithPlugins.someMetalsmithThing())
        .use(metalsmithPlugins.someOtherMetalsmithThing())
        .build();
```


### Tip

If you already loaded your package.json's data, pass it as config option to speed up things:

``` javascript
var pkg = require(process.cwd() + '/package.json'),
    plugins = require('auo-plug')({ prefix: 'foo', config: pkg });
```


## Options

You either have to define a `prefix` or a `pattern` and `replaceExp`. All other options are optional.

  - `prefix`  
    can be used to quickly define `pattern` and `replaceExpr` at once (see [default options](#default-options))

  - `pattern`  
    (default: `[prefix + '-*', prefix + '.*']`)  
    a globbing pattern to find packages in config for require

  - `replaceExpr`  
    (default: `new RegExp('^' + prefix + '([\.-])')`)  
    a regular expression for what shall be removed from a package name when adding to container object

  - `scope`  
    (default: `['dependencies', 'devDependencies']`)  
    which keys in config object contain packages to require

  - `module`
    (default: the module that executed `require('auto-plug')`)
    The module used to find the default `config` and `requireFn` options
    
  - `config`  
    (default: `module` option's package.json data)  
    the config where auto-plug will look for packages to require; can be a plain object or a string containing a path to require

  - `requireFn`  
    (default: `module` option's `require` property)  
    the function to be used for requiring packages

  - `camelize`  
    (default: `true`)  
    whether package names should be converted to camelcase when adding to container object or not

  - `lazy`  
    (default: `true`)  
    whether packages should be lazy-loaded (loaded when called for the first time) or directly when calling auto-plug

  - `rename`  
    (default: `{}`)  
    a plain object for custom renaming; keys are original package names and values the respective rename string


### Default options

``` javascript
{
    prefix: undefined,
    pattern: [prefix + '-*', prefix + '.*'],
    replaceExpr: new RegExp('^' + prefix + '([\.-])'),
    scope: ['dependencies', 'devDependencies'],
    module: module.parent, // the module that require()'d auto-plug
    config: findup('package.json', {cwd: path.dirname(this.options.module.filename)}),
    requireFn: this.options.module.require.bind(this.options.module),
    camelize: true,
    lazy: true,
    rename: {}
}
```


## API Usage

``` javascript
// get your AutoPlug instance
var AutoPlug = require('auto-plug').AutoPlug,
    autoPlug = new AutoPlug('gulp');
// find matching packages, require them and add them to container
autoPlug.plug();
// manually add a package to container
autoPlug.addPackageToContainer('runSequence');
// get the container
var g = autoPlug.getContainer();
```


## License

[MIT &copy; 2014 Simon Lepel](http://simbo.mit-license.org/)

