'use strict';

import { Component } from 'barfoos2.0/core.js';
import { mix, extend } from 'barfoos2.0/toolkit.js';
import { win, doc } from 'barfoos2.0/domkit.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
//import io from 'socket.io-client';
import htmlx from './markup/markup.htmlx';
import style from './style/style.css';

const videoLink = '/video/intro_,72,48,36,0.mp4.urlset/master.m3u8';
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

		console.log('TopSection is entering the stage boys and girls..');

		this.initIntroductionVideo();

		return Promise.all( this.dependencies ).then( Return => this );
	}

	initIntroductionVideo() {
		const video = this.nodes[ 'video.introduction' ];

		video.onerror = function( err ) {
			console.log('No native HLS support, trying to emulate...');
			let scr = doc.createElement( 'script' );
			scr.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
			scr.onload = () => {
				if( Hls.isSupported() ) {
					let hls = new Hls();
					hls.loadSource( videoLink );
					hls.attachMedia( v );
					hls.on( Hls.Events.MANIFEST_PARSED, () => video.play() );
				} else {
					console.log('No HLS support at all, playing normal video.');
					video.src = '/video/intro_720.mp4';
				}
			};

			doc.head.appendChild( scr );
		};

		video.onloadeddata = function() {
			console.log('HLS segment received, starting playback.');
			video.play();
		};

		video.src = videoLink;
	}
}

// possibly mixin features here

async function start() {
	style.use();

	const inst = await new TopSection();
}

export { start };
