/**
	* @example
	* node ../../bin/komet.js komet css
	* node ../../bin/komet.js komet css -a
	*/

var komet = require('komet');

komet.task({
	alias:"css",
	entry:'./tasks/css.js',
	dependsof:['sprite', 'fonts', 'other']
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
	alias:'static',
	dependsof:['css', 'pug', 'babel']
});

komet.task({
	alias:'babel',
    command: "babel -w ./src -d ./lib"
});
