var opt = require('./rpoptjs/rpopt.js');
var genfile = null;
var cfgfile = null;
opt.on("g generate", function(file) { genfile = file; },
        "Generate a default config named FILE.json");
opt.on("c config", function(file) { cfgfile = file; },
        "Run using config FILE");
opt.parse(require('system').args);

var months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
var days=['sun','mon','tue','wed','thu','fri','sat'];
var times = [
    'Thu Sep 04 2014 17:06:00 GMT-0500',
    'Thu Sep 04 2014 17:07:00 GMT-0500',
    'Thu Sep 04 2014 17:08:00 GMT-0500'
];
var delay = 42;
// to enforce selecting exactly one option, make sure they're neither both not 
// set nor both set, effectively just an XNOR
if (!genfile == !cfgfile) {
    console.log("Please provide exactly one of the options.\n")
    opt.printUsage();
    phantom.exit();
}

console.log("Genfile: "+genfile);
console.log("Cfgfile: "+cfgfile);
if(!cfgfile) {
    console.log("ONLY GIVE CONFIG NOW PLZ");
    phantom.exit();
}
var cfg = require('./'+cfgfile);
cfg.timing.forEach(function(t) {
    console.log(new Date(t.time)+" ("+t.mins+")");
});
phantom.exit();
//==========
// TODO: JSON configuration file for each run has profile,
//       dir, viewport size, lat, long, zoom, and timestamps
var profile = '99lgwcgi.default';
var sql = "SELECT * FROM moz_cookies WHERE host = \"www.ingress.com\"";
var dir = '/home/robert/.mozilla/firefox/' + profile + '/cookies.sqlite';

// child_process is a phantomjs module that allows for running of external
// commands.  spawn does node-style event handling for stdout/stderr; fileExec
// (also in child_process) returns file descriptors.  I prefer the former.
var spawn = require("child_process").spawn;
var child = spawn('sqlite3', [dir, sql]);

// this child process pulls out all cookies for "www.ingress.com" from the
// specified Firefox cookie database.  This equates, importantly, to pulling out
// the google authentication cookie for that site, so I don't have to try to
// automate OAuth login.  Because that's disgusting.
child.stdout.on("data", function(data) {
    //data is returned as col|col|col|col\ncol|col|col|col\n
    var split = data.trim().split("\n"); // .trim() prevents empty entry at end
    var rows = split.map(function(val) { return val.split('|'); });
    // there will always be three cookies unless Google changes their backend
    for(i = 0; i < 3; i++) {
        // in the sqlite database firefox uses for cookies, the columns
        // we care about, in order, are 4, 5, 6, 7, 12, 11, and 8. See
        // gencookie, below.
        phantom.addCookie(gencookie(
            [4, 5, 6, 7, 12, 11, 8].map(function(k) { return rows[i][k]; })
        ));
    };
});

// note this is stdERR, not the above stdOUT.
child.stderr.on("data", function(data) {
    console.log("Sqlite3 error: " + JSON.stringify(data));
});

// each of the following k-v pairs is the name-value part of a cookie that
// ingress.com/intel uses to record latlong.  Setting the cookie goes to the
// right location. All have everything else the same, so it's easy to loop over
// these, the bare-minimum different parts. See gencookie for ordering details.
var cks = {
    'lat': '30.259751',
    'lng': '-457.714462',
    'shift': 'viz',
    'zoom': '12'
};
Object.keys(cks).forEach(function(key) {
    phantom.addCookie(gencookie(
        ['ingress.intelmap.' + key, cks[key],
        'www.ingress.com', '/', 'false', 'false',
        // arbitrarily, let it expire a week from now.  Expiry expects
        // milliseconds.
        (new Date()).getTime() + (7 * 24 * 60 * 60 * 1000)]
    ));
});

function takeScreenshot(afterpage) {
    var page = require('webpage').create();
    page.viewportSize = { width: 1900, height: 1000 };
    page.open('http://ingress.com/intel/', function (status) {
        if (status !== 'success') {
            // theoretically other things can go wrong, I think, but that's the
            // only thing I've ever had cause problems:
            console.log('Unable to access the network!');
            phantom.exit();
        } else {
            // we wait for timeout to allow the page to load all the portals
            // and links.  I've never had 42 not work, it might be able to
            // go lower.  TODO: it'll be configurable.
            window.setTimeout(function() {
                var now = new Date();
                page.render(
                    days[now.getDay()]+'_'+
                    months[now.getMonth()]+'_'+
                    pad(now.getDate())+'_'+
                    now.getFullYear()+'_'+
                    pad(now.getHours())+'.'+
                    pad(now.getMinutes())+'.'+
                    pad(now.getSeconds())+'.png'
                );
                page.close();
                afterpage();
            }, delay * 1000);
        }
    });
}
// wait until the cookie-scraping child program does its thing to try loading a
// webpage to prevent sadness and a lack of authentication
child.on("exit", function(code) {
    if(code != 0) {
        console.log("ERROR: exit code " + code);
        phantom.exit();
    };
    for(i=0; i<times.length; i++) {
        times[i] = new Date(times[i]) - (delay * 1000);
        console.log("Adjusted: "+new Date(times[i]));
    }
    function ssTimer(i) {
        console.log(i+"|Taking screenshot at "+(new Date()));
        var now = new Date();
        takeScreenshot(function() {
            if (i+1 >= times.length) {
                console.log("End");
                phantom.exit();
                return;
            }
            setTimeout(function() {
                ssTimer(i+1);
            }, new Date(times[i+1]) - new Date());
        });
    }

    console.log("Timeout for 0 in "+(new Date(times[0])-new Date())+"ms.");
    var i = 0;
    while (new Date(times[i]) < new Date()) {
        i++;
    }
    if (i+1 < times.length) {
        setTimeout(function() {
            ssTimer(0);
        }, new Date(times[0]) - new Date());
    }
});

// returns an object representing a cookie in the format that phantomjs expects.
function gencookie(values) {
    return {
        'name':     values[0],
        'value':    values[1],
        'domain':   values[2],
        'path':     values[3],
        'httponly': values[4],
        'secure':   values[5],
        'expires':  values[6]
    };
};

function pad(n) {
    return (n < 10 ? '0' : '') + n;
}
