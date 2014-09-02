var log = []
function assert(condition, message) {
    if (!condition) {
        throw '+++ ERROR: ' + (message || "Assertion failed");
    }
}
function assertLog(text, line) {
    assert(log.last() === text, line);
}
Array.prototype.last = function() {
    return this[this.length - 1];
}

var opts = require('rpopt');

opts.on('a aa', function() { console.log('a'); }, 'AAaaaaa?');
opts.on('b bbbb', function(foo) { console.log('Arg to b: '+foo); }, 'bbbbbbbbb!');
opts.on('c cccccc', function(bar, baz) { console.log('Args to c: '+bar+', '+baz); }, 'cccccc');

opts.printUsage = function(header) { };
(function() {
    var oldLog = console.log;
    console.log = function (message) {
        log.push(message);
        oldLog.apply(console, message);
    };
})();

opts.parse('-a');
assertLog('a', '30');

opts.parse('-b');
assertLog('Error: argument required for option -b.\n', '33');


