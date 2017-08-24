'use strict';

import { Component } from 'barfoos2.0/core.js';
import { extend } from 'barfoos2.0/toolkit.js';
import { moduleLocations } from 'barfoos2.0/defs.js';

import { loadVideo } from 'video.js';

//import io from 'socket.io-client';
import htmlx from '../markup/markup.htmlx';
import style from '../style/style.scss';

const	videoLink		= '/video/intro_,108,72,48,36,0.mp4.urlset/master.m3u8',
		fallbackPath	= '/fallback/intro_480.mp4';

/*var socket = io( 'http://judgemy.org' );

socket.emit('echo', 'oh my.. wtf!!');
socket.on('pongo', ( data ) => {
	console.log( 'recv from server: ', data );
});*/

/*****************************************************************************************************
 * Class TopSection inherits from BarFoos Component, GUI Module
 *****************************************************************************************************/
class TopSection extends Component {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			location:		moduleLocations.center,
			tmpl:			htmlx({
				test:	'replaced by bf template'
			})
		}).and( input );

		super( options );

		this.runtimeDependencies.push(
			this.fire( 'waitforHLSSupport.appEvents' )
		);

		return this.init();
	}

	async init() {
		this.on( 'backgroundImageLoaded.core', this.onBackgroundImageLoaded, this );

		await super.init();

		console.log('nodes: ', this.nodes);

		return this;
	}

	async onBackgroundImageLoaded() {
		this.log( 'onBackgroundImageLoaded, now loading background video...' );

		let video = await loadVideo( videoLink, this.nodes[ 'video.introduction' ], fallbackPath );

		this.on( 'appVisibilityChange.appEvents appFocusChange.appEvents', ( active, event ) => {
			if( active && video.paused ) {
				this.log( `${event.name}: active: ${ active } and paused: ${ video.paused }, play video!`);
				video.play();
			}

			if(!active && !video.paused) {
				this.log( `${event.name}: active: ${ active } and paused: ${ video.paused }, paused video!`);
				video.pause();
			}
		});
	}
}
/****************************************** TopSection End ******************************************/

/*****************************************************************************************************
 *  Entry point for this GUI Module.
 *****************************************************************************************************/
async function start() {
	style.use();

	const inst	= await new TopSection();
}

export { start };
