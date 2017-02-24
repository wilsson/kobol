/**
 * @example
 * node ../../bin/komet.js komet css
 * node ../../bin/komet.js komet css -a
 */

var komet = require('../../lib/index.js');

komet.task({
	alias:'css',
	entry:'./tasks/css.js',
    dependsof:['sprite', 'fonts', 'otro']
});

komet.task({
	alias:'sprite',
	entry:'./tasks/sprite.js'
});

komet.task({
	alias:'fonts',
	entry:'./tasks/fonts.js'
});

komet.task({
    alias:'pug',
    entry:'./tasks/pug.js'
});

komet.task({
    alias:'clean-html',
    entry:'./tasks/clean-html.js'
});

