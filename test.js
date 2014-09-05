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

var opts = require('./rpopt');

function setOn() {
    opts.on('a aa', function() { console.log('a'); }, 'AAaaaaa?');
    opts.on('b bbbb', function(foo) { console.log('Arg to b: '+foo); }, 'bbbbbbbbb!');
    opts.on('c cccccc', function(bar, baz) { console.log('Args to c: '+bar+', '+baz); }, 'cccccc');
};
setOn();

opts.printUsage = function(header) { };
(function() {
    var oldLog = console.log;
    console.log = function (message) {
        log.push(message);
        oldLog(message);
    };
})();

opts.parse(['-a']);
assertLog('a', 33);

opts.parse(['-b']);
assertLog('Error: too few arguments for option -b.', 36);

opts.parse(['--bbbb'])
assertLog('Error: too few arguments for option --bbbb.', 39);

opts.parse(['-b','bar']);
assertLog('Arg to b: bar', 42);

opts.parse(['-bbar']);
assertLog('Arg to b: bar', 45);

opts.parse(['--bbbb','bar'])
assertLog('Arg to b: bar', 48);

opts.parse(['--bbbb=bar'])
assertLog('Arg to b: bar', 51);

opts.parse(['-b','bar','baz']);
assertLog('Error: too many arguments to option -b.', 54);

opts.parse(['--bbbb','bar','baz']);
assertLog('Error: too many arguments to option --bbbb.', 57);

opts.parse(['-c','red','blue']);
assertLog('Args to c: red, blue', 60);

opts.parse(['--cccccc', 'red', 'blue']);
assertLog('Args to c: red, blue', 63);

opts.parse(['-c']);
assertLog('Error: too few arguments for option -c.', 66);

opts.parse(['-c','red']);
assertLog('Error: too few arguments for option -c.', 69);

opts.parse(['--cccccc']);
assertLog('Error: too few arguments for option --cccccc.', 72);

opts.parse(['--cccccc','red']);
assertLog('Error: too few arguments for option --cccccc.', 75);

opts.parse(['-c', 'red', 'blue', 'green']);
assertLog('Error: too many arguments to option -c.', 78);

opts.parse(['--cccccc', 'red', 'blue', 'green']);
assertLog('Error: too many arguments to option --cccccc.', 81);

opts.reset(); setOn();
opts.parse(['-a']);
assert(opts('a') === true, '82');

opts.reset(); setOn();
opts.parse(['-b', 'foo']);
assert(opts('a') === false, '89');
assert(opts('b') === 'foo', '90');

opts.reset(); setOn();
opts.parse(['-c', 'do', 're']);
assert(opts('a') === false, '94');
assert(opts('b') === false, '95');
assert(opts('c')[0] === 'do', '96');
assert(opts('c')[1] === 're', '96');
