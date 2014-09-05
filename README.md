Intelshot
=========

Making intel screenshot more awesome.

Setup
-----
You need the following software installed on some sort of linux box:
* firefox
* sqlite3
* phantomjs

The following needs to be done manually:
* Point firefox to http://ingress.com/intel and log in.
* Look in ~/.mozilla/firefox/profiles and get the name of your profile,
  probably a jumble of characters and then `.default`.
* Open screenshot.js and put that profile name in the `profile` variable on line
  38
* Edit the `username` variable on line 2 to match your home directory.  If your
  home directory or your firefox profile are somewhere weird, you'll have to
  edit the `dir` variable on line 40.
* If your internet is weird and the intel page takes more than 45 seconds to
  load, edit `load_delay` on line 18.
* Edit the `cks` object on line 76 to contain the info you want. Don't change
  `shift`; I have no idea what that does.
* Edit demo.json (feel free to rename it) to contain your desired timing.
  Follow the format of the file. The `secs` field is the number of seconds
  between screenshots.  This cannot be less than or equal to `load_delay`, and
  things might go wonky if it's not at least five or ten seconds larger to
  account for possible page-load bizarreness.  Feel free to add more points at
  which the timing changes; theoretically, the RAM's the limit. The "end" timing
  will *not* have an associated screenshot, so don't expect it to.

Finally, to run it, just do `phantomjs screenshot.js -c demo.json`, or whatever
you named your json file. Enjoy your screenshots!



