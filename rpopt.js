var sortInsert = function(a, o) {
    var l = 0, u = a.length, m;
    while (l<=u) {
        var n = a[(m = ((l + u) >> 1))];
        if (n && o.sopt > n.sopt) l = m + 1;
        else u = (o === a[m]) ? -2 : m - 1;
    }
    a.splice((u === -2) ? m : u + 1, 0, o);
}
if (typeof String.prototype.startsWith != 'function') {
    String.prototype.startsWith = function(str) {
        return this.lastIndexOf(str, 0) === 0;
    }
}
function wrap(str, len, brk, first) {
    len = len || 75;
    brk = brk || '\n';
    if (first === null) first = true;

    if (!str || str.length < len) return str;
    var m = /\s\S*$/.exec(str.substring(0, first ? len + 1 : len+2-brk.length));
    var i = m ? m.index : len;
    var j = m ? i + 1 : i;
    return str.substring(0, i) + brk + wrap(str.substring(j), len, brk, false);
}

var args = [];
var usage, subtitle, onEmpty;
var on = function(scmd, action, desc) {
    var cmd = scmd.trim();
    var req = false;
    if (cmd.startsWith(':')) {
        req = true;
        cmd = cmd.substring(1);
    }
    var split = cmd.split(/\s/);
    var shopt = split[0];
    var lnopt = split[1] || null;
    var argv  = /\((.*)\)/.exec(action.toString())[1].split(/,\s*/);
    sortInsert(args, {
        'sopt': shopt,
        'lopt': lnopt,
        'reqd': req,
        'argc': action.length,
        'argv': ' ' + argv.join(', ').toUpperCase(),
        'func': action,
        'desc': desc
    });
};

var calledBy = function(str) {
    usage = str;
}

var subtitle = function(str) {
    subtitle = str;
}

var printUsage = function(header) {
    if (header === null) header = true;
    if(header && usage) {
        console.log('Usage: ' + usage + (subtitle ? '\n' + subtitle : '') + '\n');
    }
    console.log('Options:');
    var max = 0;
    args.forEach(function(arg) {
        var len = 5 + (arg.lopt ? 4 + arg.lopt.length : 0) + arg.argv.length;
        if (len > max) max = len;
    });
    args.forEach(function(arg) {
        var str = '-' + arg.sopt + (arg.lopt ? ', --' + arg.lopt : "") + arg.argv;
        while(str.length < max) str += ' ';
        var spaces = '\n';
        for(i=0; i < str.length; i++) spaces += ' ';

        console.log(wrap(str + arg.desc, 75, spaces));
        console.log();
    });
}

var empty = function(func) {
    onEmpty = func;
}

function isShort(arg) { return /^-[^-]/.test(arg); }
function isLong(arg) { return /^--.+/.test(arg); }
function isOpt(arg) { return isShort(arg) || isLong(arg); }
function getOpt(arg) {
    if(!isOpt(arg)) return null;
    args.forEach(function(a) {
    if(a.lopt === 
var parse = function(args) {
    for(i=0; i<args.length; i++) {
        var arg = args[i];
        if (!isOpt(arg)) continue;
        

    }
}
module.exports.on = on;
module.exports.printUsage = printUsage;
module.exports.calledBy = calledBy;
module.exports.subtitle = subtitle;
module.exports.parse = parse;
module.exports.empty = empty;
