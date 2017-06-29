'use strict';

import { Component, init } from 'barfoos2.0/core.js';
import { mix, extend } from 'barfoos2.0/toolkit.js';
import { win, doc } from 'barfoos2.0/domkit.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
//import io from 'socket.io-client';
import htmlx from './markup.htmlx';
import style from './style.css';

/*var socket = io( 'http://judgemy.org' );

socket.emit('echo', 'oh my.. wtf!!');
socket.on('pongo', ( data ) => {
	console.log( 'recv from server: ', data );
});*/

class Module1 extends Component {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			location:		moduleLocations.right,
			tmpl:			htmlx({
				test:	'replaced by bf template'
			})
		}).and( input );

		super( options );

		console.log('Module1 is entering the stage boys and girls..');

		return new Promise( (res, rej) => {
			setTimeout(() => {
				console.log('fake delay passed!');
				res( this );
			}, 3000);
		});
	}
}

// possibly mixin features here

async function main() {
	style.use();

	const inst = await init( Module1 );
	console.log('instance is: ', inst);
}

export { main };


