'use strict';

import { Component } from 'barfoos2.0/core.js';
import { extend } from 'barfoos2.0/toolkit.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { loadVideo, VideoTools } from 'video.js';

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

		this.addNodeEvent( 'a.revealIntro', 'click', this.showIntro );

		return this;
	}

	async onBackgroundImageLoaded() {
		if( true ) {
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
		let {	myVideo,
				w1,
				w2,
				w3,
				'a.revealIntro':revealIntro,
				'li.homeContainer':logo,
				'li.jumpListContainer':menu,
			 	'li.titleContainer':title,
			 	'ul.navOverlay':navOverlay,
				'div.gridOverlay':gridOverlay } = this.nodes;

		this.removeNodeEvent( revealIntro, 'click', this.showIntro );

		new VideoTools( myVideo ).fadeVolumeIn();

		let logoTransition = this.transition({
			node:		logo,
			className:	'moveOverViewportTop invisible',
			rules:		{
				duration:	400
			}
		});

		let crossTransition = this.transition({
			node:		revealIntro,
			className:	'bottomLeftCorner',
			rules:		{
				duration:	1100
			}
		});

		let menuTransition = this.transition({
			node:		menu,
			className:	'moveThroughScreen invisible',
			rules:		{
				duration:	400
			}
		});

		let gridTransition = this.transition({
			node:		gridOverlay,
			style:		{ opacity: 0 },
			rules:		{
				duration:	400
			}
		});

		await menuTransition;

		revealIntro.textContent = '↻';
		revealIntro.classList.add( 'returnSymbol' );

		let word1Transition = this.transition({
			node:		w1,
			className:	'flutterLeft invisible',
			rules:		{
				timing:		'ease-in-out',
				duration:	2200
			}
		});

		let word2Transition = this.transition({
			node:		w2,
			className:	'flutterStraight invisible',
			rules:		{
				timing:		'ease-in-out',
				duration:	2200
			}
		});

		let word3Transition = this.transition({
			node:		w3,
			className:	'flutterRight invisible',
			rules:		{
				timing:		'ease-in-out',
				duration:	1700
			}
		});

		await word3Transition;

		myVideo.classList.remove( 'darken' );
		title.style.visibility = 'hidden';

		await Promise.all([ logoTransition, crossTransition, menuTransition, word1Transition, word2Transition, word3Transition ]);

		this.addNodeEvent( 'a.revealIntro', 'click', this.returnToMenu );
	}

	returnToMenu = async event => {
		let {	myVideo,
				w1,
				w2,
				w3,
				'a.revealIntro':revealIntro,
				'li.homeContainer':logo,
				'li.jumpListContainer':menu,
				'li.titleContainer':title,
				'ul.navOverlay':navOverlay,
			 	'div.gridOverlay':gridOverlay } = this.nodes;

		this.removeNodeEvent( revealIntro, 'click', this.returnToMenu );

		title.style.visibility = '';

		myVideo.classList.add( 'darken' );
		myVideo.controls	= false;

		new VideoTools( myVideo ).fadeVolumeOut();

		revealIntro.textContent = '\u2720';
		revealIntro.classList.remove( 'returnSymbol' );

		await Promise.all( [ w1, w2, w3, gridOverlay, revealIntro, logo, menu ].map( node => this.data.get( node ).storage.transitions.last.undo() ) );

		this.addNodeEvent( revealIntro, 'click', this.showIntro );
	};
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
