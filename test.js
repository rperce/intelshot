var tmg = require('./bb.json').timing;

function timer(i) {
    var now = new Date();
    console.log(i+"|"+now);
    var delay = tmg[i].mins;
    if(delay === "end") {
        console.log("done");
        return;
    }
    delay *= 60000;

    if((new Date(tmg[i+1].time)-0) < ((now-0) + delay)) {
        i = i+1;
        delay = tmg[i].mins;
        if(delay === "end") {
            console.log("done");
            return;
        }
        delay = new Date(tmg[i].time) - new Date();
    }
    setTimeout(function() {
        timer(i);
    }, delay);
}

var i = 0;
tmg.some(function(t) {
    var then = new Date(t.time);
    if(then > new Date()) {
        var j = i;
        console.log(then-new Date());
        setTimeout(function() {
            timer(j);
        }, then - new Date());
        return true;
    }
    i += 1;
});
