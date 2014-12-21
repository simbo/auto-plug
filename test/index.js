
var autoPlug = require('..'),
    assert = require('assert');

describe('auto-plug', function() {

    it('should return a plain object', function() {
        assert({}, autoPlug());
    });

});
