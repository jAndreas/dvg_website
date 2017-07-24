'use strict';

import * as topSection from './modules/topsection/js/main.js';
import { LogTools } from 'barfoos2.0/domkit.js';

const console	= new LogTools({ id: 'app' });

console.log('starting topSection...: ');
topSection.start();

/*
document.getElementById( 'foo' ).addEventListener( 'click', function( event ) {
	alert('requesting... via import()');

	import( /* webpackChunkName: "TopSection" / './modules/topsection/js/main.js' ).then( TopSection => {
		console.log( 'main.js transfered and evaluated, value: ', TopSection );
		TopSection.start();
	}).catch( err => {
		console.log('ERR: ', err);
	});
	console.log('!!IF THIS WRITES BEFORE LOADED HINT, IT IS ASYNC!');
}, false);

setTimeout(function() {
	import( /* webpackChunkName: "Module2" / './modules/mod2/entry.js' ).then( MOD2 => {
		console.log('REALLY NEWSTYLE mod2.js was transfered and now gets evaluated immediately: ', MOD2);
	}).catch( err => {
		console.log('ERR: ', err);
	});
}, 2000);
*/
