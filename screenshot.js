var child_process = require('child_process');
var opt = require('./rpoptjs/rpopt.js');
var fs = require('fs');
opt.on("g generate", function(file) {},
        "Generate a default config named FILE.json");
opt.on("c config", function(file) {},
        "Run using config FILE");
opt.on("f force", function() {},
        "Take a single screenshot right now");
opt.parse(require('system').args);

// to enforce selecting exactly one option, make sure they're neither both not
// set nor both set, effectively just an XNOR
if (!opt('g') == !opt('c')) {
    console.log("Please provide exactly one of -g and -c.\n")
    opt.printUsage();
    phantom.exit();
}

if (!opt('c')) {
    console.log("ONLY GIVE CONFIG FOR NOW PLZ");
    phantom.exit();
}
var cfg = require('./'+opt('c'));
var tmg = cfg.timing;
var load_delay = cfg.load_delay;
var dir = cfg.ff_dir + cfg.ff_profile + '/cookies.sqlite';
var sql = 'SELECT * FROM moz_cookies WHERE host = "www.ingress.com"';
var months=
    ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
var days=['sun','mon','tue','wed','thu','fri','sat'];

// we need an execFile environment below to prevent failure when sqlite3 is
// missing, but execFile environments think ~ is part of an absolute path. To
// get around having to specify an absolute path in config, this kludge checks
// if the first character is a ~ and, if it is, replaces it with the output of
// `printenv HOME`... in a spawn environment, so we can actually see environment
// variables.  Great success!
if (dir.charAt(0) === '~') {
    child_process.spawn('printenv','HOME').stdout.on('data', function(data) {
        cfg.ff_dir = data.trim() + cfg.ff_dir.substring(1);
        dir = data.trim() + dir.substring(1);
        body();
    });
} else {
    body();
}

// each of the following k-v pairs is the name-value part of a cookie that
// ingress.com/intel uses to record latlong.  Setting the cookie goes to the
// right location. All have everything else the same, so it's easy to loop over
// these, the bare-minimum different parts. See gencookie for ordering details.
var cks = {
    'lat': cfg.lat,
    'lng': cfg.lng,
    'shift': 'viz',
    'zoom': cfg.zoom
};

// child_process is a phantomjs module that allows for running of external
// commands.  execFile gives file descriptors and, more importantly, allows
// to set a timeout to prevent hanging on nonexistent sqlite3.
var execFile = child_process.execFile;

// this child process pulls out all cookies for "www.ingress.com" from the
// specified Firefox cookie database.  This equates, importantly, to pulling out
// the google authentication cookie for that site, so I don't have to try to
// automate OAuth login.  Because that's disgusting.
function body() {
validateConfig(cfg);
var sqopts = {timeout: 5000};
execFile('sqlite3', [dir, sql], sqopts, function(errcode, stdout, stderr) {
    if (stdout==='' && stderr==='') {
        error('sqlite3 not found');
    }
    if (!(stderr==='')) {
        error('sqlite3 error: '+stderr);
    }
    //data is returned as col|col|col|col\ncol|col|col|col\n
    //.trim() prevents empty entry at end
    var split = stdout.trim().split("\n");
    var rows = split.map(function(val) { return val.split('|'); });
    // there will always be three cookies unless Google changes their backend
    for(i = 0; i < 3; i++) {
        // in the sqlite database firefox uses for cookies, the columns
        // we care about, in order, are 4, 5, 6, 7, 12, 11, and 8. See
        // gencookie, below.
        phantom.addCookie(gencookie(
            [4, 5, 6, 7, 12, 11, 8].map(function(k) { return rows[i][k]; })
        ));
    }

    Object.keys(cks).forEach(function(key) {
        phantom.addCookie(gencookie(
            ['ingress.intelmap.' + key, cks[key],
            'www.ingress.com', '/', 'false', 'false',
            // arbitrarily, let it expire a week from now.  Expiry expects
            // milliseconds.
            (new Date()).getTime() + (7 * 24 * 60 * 60 * 1000)]
        ));
    });

    if (opt('f')) {
        takeScreenshot(function() {
            phantom.exit();
        });
    } else {
        console.log("Done to 90");
        phantom.exit();

        // this is inside the callback in order to wait until the cookie-scraping
        // child program does its thing to try loading a webpage to prevent sadness
        // and a lack of authentication
        for(i=0; i<tmg.length; i++) {
            tmg[i].time = new Date(tmg[i].time) - (load_delay * 1000);
            console.log("Adjusted: "+new Date(tmg[i].time));
            console.log("   Delay: "+tmg[i].secs);
        }
        function ssTimer(last, i) {
            console.log(i+"|Taking screenshot at "+(new Date()));
            var now = new Date();
            takeScreenshot(function() {
                var delay = tmg[i].secs;
                if (delay === "end") {
                    console.log("done");
                    phantom.exit();
                }
                delay *= 1000;
                var next = new Date(last + delay);

                if ((new Date(tmg[i+1].time)-0) < ((now-0) + delay)) {
                    i += 1;
                    delay = tmg[i].secs;
                    if (delay === "end") {
                        console.log("done");
                        phantom.exit();
                    }
                    next = new Date(tmg[i].time);
                }
                console.log("Delay: "+(next - Date.now()));
                setTimeout(function() {
                    ssTimer(next-0, i);
                }, next - Date.now());
            });
        }

        var i = 0;
        tmg.some(function(t) {
            var then = new Date(t.time);
            if (then > new Date()) {
                var j = i;
                console.log("Wait "+(then - new Date()) +" for "+j);
                setTimeout(function() {
                    ssTimer(then-0, j);
                }, then - new Date());
                return true;
            }
            i += 1;
        });
    } //if (opt('f')
}); //execFile
} // body()
// phantomjs should be initialized by cookies and suchlike above before this
// method is called
function takeScreenshot(afterpage) {
    var page = require('webpage').create();
    page.viewportSize = { width: cfg.width, height: cfg.height };
    page.open('http://ingress.com/intel/', function (status) {
        if (status !== 'success') {
            // theoretically other things can go wrong, I think, but that's
            // the only thing I've ever had cause problems:
            console.log('Unable to access the network!');
            phantom.exit();
        } else {
            // we wait for timeout to allow the page to load all the portals
            // and links.
            window.setTimeout(function() {
                console.log(load_delay * 1000);
                var now = new Date();
                page.render(cfg.outputDir+'/'+
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
            }, load_delay * 1000);
        }
    });
}
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

function error(str) {
    console.log('Error: '+str);
    phantom.exit();
}
function checkLegitFile(name, value, dir) {
    if(!fs.exists(value)) {
        error(name+' ('+value+') does not exist');
    } else if(!fs.isReadable(value)) {
        error(name+' ('+value+') is not readable');
    } else if(!(fs.isDirectory(value) === dir)) {
        error(value + 'should ' + (dir ? '' : 'not ') + 'be a directory');
    }
}

function validateConfig(cfg) {
    var demo = JSON.parse(generateDefaultConfig());
    Object.keys(demo).forEach(function(key) {
        if(!(cfg[key])) {
            error(key+' is not defined in given config');
        }
    });
    checkLegitFile('ff_dir', cfg.ff_dir, true);
    checkLegitFile('ff_profile', cfg.ff_dir + cfg.ff_profile, true);
    checkLegitFile('outputDir', cfg.outputDir, true);

    var load = cfg.load_delay;
    cfg.timing.forEach(function(t) {
        if(t.secs === 'end') {
            return;
        }
        if(t.secs < load) {
            error('delay for "'+t.time+'" is less than load_time ('+load+'s)');
        }
    });
}

function generateDefaultConfig() {
    return '{\n'+
        '    "ff_profile": "99lgwcgi.default",\n'+
        '    "timing": [{"time":"Thu Sep 04 2014 20:30:00 GMT+0000",\n'+
        '                "secs": 120},\n'+
        '               {"time":"Thu Sep 04 2014 20:45:00 GMT+0000",\n'+
        '                "secs": "end"}\n'+
        '    ],\n'+
        '    "lat": "1.111111",\n'+
        '    "lng": "1.111111",\n'+
        '    "zoom": "4",\n'+
        '    "outputDir": "out",\n'+
        '    "width": 1900,\n'+
        '    "height": 1000,\n'+
        '    "load_delay": 45,\n'+
        '    "ff_dir": "~/.mozilla/firefox/"\n'+
        '}\n'
}
