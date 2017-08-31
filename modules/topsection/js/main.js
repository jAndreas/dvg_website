'use strict';

import { Component } from 'barfoos2.0/core.js';
import { extend } from 'barfoos2.0/toolkit.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { transition } from 'barfoos2.0/domkit.js';
import { loadVideo } from 'video.js';

//import io from 'socket.io-client';
import htmlx from '../markup/markup.htmlx';
import style from '../style/style.scss';
import transforms from '../style/transforms.scss';

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

		this.addNodeEvent( this.nodes[ 'a.revealIntro' ], 'click', this.showIntro );

		return this;
	}

	async onBackgroundImageLoaded() {
		if( ENV_PROD ) {
			let video = await loadVideo( videoLink, this.nodes[ 'video.introduction' ], fallbackPath );

			this.on( 'appVisibilityChange.appEvents appFocusChange.appEvents', ( active, event ) => {
				if( active && video.paused ) {
					video.play();
				}

				if(!active && !video.paused) {
					video.pause();
				}
			});
		}
	}

	showIntro = async event => {
		this.removeNodeEvent( this.nodes[ 'a.revealIntro' ], 'click', this.showIntro );

		let {	myVideo, w1, w2, w3, 'a.revealIntro':revealIntro, 'li.WatchIntroContainer':cross,
				'li.homeContainer':logo, 'li.jumpListContainer':menu, 'li.titleContainer':title } = this.nodes;

		let menuTransition = transition({
			node:		menu,
			className:	'moveThroughScreen',
			rules:		{
				duration:	400
			}
		});

		await menuTransition;

		let word1Transition = transition({
			node:		w1,
			className:	'flutterLeft',
			rules:		{
				timing:		'ease-in-out',
				duration:	2400
			}
		});

		let word2Transition = transition({
			node:		w2,
			className:	'flutterStraight',
			rules:		{
				timing:		'ease-in-out',
				duration:	2800
			}
		});

		let word3Transition = transition({
			node:		w3,
			className:	'flutterRight',
			rules:		{
				timing:		'ease-in-out',
				duration:	1700
			}
		});

		await word3Transition;

		let crossTransition = transition({
			node:		revealIntro,
			className:	'bottomLeftCorner',
			rules:		{
				duration:	400
			}
		});

		await crossTransition;

		revealIntro.textContent = '\u27f2';
		revealIntro.classList.add( 'returnSymbol' );

		myVideo.classList.remove( 'darken' );
		myVideo.muted		= false;
		myVideo.controls	= true;

		this.nodes[ 'a.revealIntro' ].addEventListener( 'click', this.returnToMenu, false );
	}
}
/****************************************** TopSection End ******************************************/

/*****************************************************************************************************
 *  Entry point for this GUI Module.
 *****************************************************************************************************/
async function start() {
	[ transforms, style ].forEach( style => style.use() );

	const inst	= await new TopSection();
}

export { start };
