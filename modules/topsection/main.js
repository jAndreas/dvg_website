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

class TopSection extends Component {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			location:		moduleLocations.center,
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

	async main() {
		await this.appEvents.fire( 'waitForDOM' );
		console.log( 'TopSection main()', this );
	}
}

// possibly mixin features here

async function main() {
	style.use();

	new TopSection();
}

export { main };
