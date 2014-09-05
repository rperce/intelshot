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
var reset = function() { args = []; }
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
        '_argv': null,
        'func': action,
        'desc': desc,
        'set': false
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
    if (header && usage) {
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

function isShort(arg) { return /^-[^-]/.test(arg) && !(/\s/.test(arg)); }
function isLong(arg) { return /^--.+/.test(arg) && !(/\s/.test(arg)); }
function isOpt(arg) { return isShort(arg) || isLong(arg); }
function getOpt(arg) {
    var ret = null;
    if (isShort(arg)) {
        args.some(function(a) {
            if (a.sopt === arg.charAt(1)) {
                ret = a;
                return true;
            }
        });
    } else if (isLong(arg)) {
        args.some(function(a) {
            var name = arg.substring(2,
                /=/.test(arg) ? arg.indexOf('=') : arg.length);
            if (a.lopt === name) {
                ret = a;
                return true;
            }
        });
    }
    return ret;
}
var parse = function(args) {
    for(i=0; i<args.length; i++) {
        var arg = args[i];
        if (!isOpt(arg)) continue;
        var optargs = [];
        var opt = getOpt(arg);
        if (opt.argc > 0) {
            if (isShort(arg)) {
                var nospace = /^(-[^-])(.*)/.exec(arg)[2]
                if (nospace.length > 0) optargs.push(nospace);
            } else if (isLong(arg)) {
                var posteql = /^(--[^=]+=?)(.*)/.exec(arg)[2];
                if (posteql.length > 0) optargs.push(posteql);
            }
            for(j=i+1; j<args.length; j++) {
                if (isOpt(args[j])) break;
                if (args[j].length > 0) {
                    optargs.push(args[j]);
                }
            }
        }
        if (optargs.length < opt.argc) {
            error('too few arguments for option '+arg+'.');
            return;
        } else if (optargs.length > opt.argc) {
            error('too many arguments to option '+arg+'.');
            return;
        }
        opt.set = true;
        opt._argv = optargs;
        opt.func.apply(this, optargs);
    }
}

var query = function(name) {
    if (name.charAt(0) != '-') {
        name = '-' + name;
    }
    var opt = getOpt(name);
    if (opt === null) {
        error('no option we know how to handle given.');
    }

    var argv = opt._argv;
    if(!opt.set) return false;
    switch(argv.length) {
        case 0:
            return opt.set;
        case 1:
            return argv[0];
        default:
            return argv;
    }
}
var error = function(err) {
    console.log('Error: '+err);
}
var setOnError = function(func) {
    if(func.length!=1) {
        throw new Error('Error function must take one argument');
    }
    error = func;
}


module.exports = query;
module.exports.on = on;
module.exports.printUsage = printUsage;
module.exports.calledBy = calledBy;
module.exports.subtitle = subtitle;
module.exports.parse = parse;
module.exports.empty = empty;
module.exports.reset = reset;
module.exports.error = setOnError;
