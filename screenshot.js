var opt = require('./rpoptjs/rpopt.js');

phantom.exit();

//==========
// TODO: JSON configuration file for each run has profile,
//       dir, viewport size, lat, long, zoom, and timestamps
var profile = '0my3q5yz.default';
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
        (new Date()).getTime() + (7 * 24 * 60 * 60 * 1000)]
    ));
});

child.on("exit", function(code) {
    if(code != 0) {
        console.log("ERROR: exit code " + code);
        phantom.exit();
    };

    var page = require('webpage').create();
    page.viewportSize = { width: 1900, height: 1000 };
    page.open('http://ingress.com/intel/', function (status) {
        if (status !== 'success') {
            console.log('Unable to access the network!');
            phantom.exit();
        } else {
            // we wait for timeout to allow the page to load all the portals
            // and links.  I've never had 42 not work, it might be able to
            // go lower.  TODO: it'll be configurable.
            window.setTimeout(function() {
                page.render('foo.png');
                phantom.exit();
            }, 42 * 1000);
        }
    });
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
