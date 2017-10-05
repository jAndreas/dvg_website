'use strict';

import { Component } from 'barfoos2.0/core.js';
import { extend } from 'barfoos2.0/toolkit.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { loadVideo, VideoTools } from 'video.js';

//import io from 'socket.io-client';
import htmlx from '../markup/main.htmlx';
import style from '../style/main.scss';
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
				test:	'CHECK'
			})
		}).and( input );

		super( options );

		this.runtimeDependencies.push(
			this.fire( 'waitforHLSSupport.appEvents' )
		);

		return this.init();
	}

	async init() {
		await super.init();

		await this.fire( 'waitForBackgroundImageLoaded.appEvents' );

		this.onBackgroundImageLoaded();

		this.addNodeEventOnce( 'a.revealIntro', 'click', this.showIntro );
		this.addNodeEventOnce( 'a.slideDownArrow', 'animationend', this.slideDownArrowAnimationEnd );
		this.addNodeEvent( 'a.slideDownArrow', 'mousedown', this.slideDownArrowClick );

		return this;
	}

	async onBackgroundImageLoaded() {
		this.log('LOAD VIDEO!!!');
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

	slideDownArrowAnimationEnd( event ) {
		event.target.classList.remove( 'initialBounce' );
	}

	async slideDownArrowClick( event ) {
		let login = await import( /* webpackChunkName: "Login Dialog" */ 'login/js/main.js'  );
		this.log('login module transfered, launching...');
		login.start();
	}

	async showIntro( event ) {
		let {	myVideo,
				w1,
				w2,
				w3,
				'a.revealIntro':revealIntro,
				'li.homeContainer':logo,
				'li.jumpListContainer':menu,
				'li.titleContainer':title,
				'div.gridOverlay':gridOverlay } = this.nodes;

		new VideoTools( myVideo ).fadeVolumeIn();

		this.addNodes( revealIntro.cloneNode( true ), 'crossClone' );
		revealIntro.insertAdjacentElement( 'afterend', this.nodes.crossClone );
		this.nodes.crossClone.classList.add( 'clone' );

		this.addNodeEvent( this.nodes.crossClone, 'click', () => {
			new VideoTools( myVideo ).seek( 2 );
		});

		await this.timeout( 10 );

		let logoTransition = this.animate({
			node:		logo,
			rules:		{
				duration:	400,
				name:		'moveOverViewportTop'
			}
		});

		let crossTransition = this.animate({
			node:		revealIntro,
			rules:		{
				duration:	1100,
				name:		'bottomLeftCorner'
			}
		});

		let crossCloneTransition = this.animate({
			node:		this.nodes.crossClone,
			rules:		{
				duration:	1100,
				name:		'bottomRightCorner'
			}
		});

		let menuTransition = this.animate({
			node:		menu,
			rules:		{
				duration:	400,
				name:		'moveThroughScreen'
			}
		});

		let gridTransition = this.animate({
			node:		gridOverlay,
			rules:		{
				duration:	400,
				name:		'invisible'
			}
		});

		await menuTransition;

		revealIntro.textContent = '↻';
		revealIntro.classList.add( 'returnSymbol' );
		this.nodes.crossClone.textContent = '⏮';
		this.nodes.crossClone.classList.add( 'replaySymbol' );
		myVideo.classList.remove( 'darken' );

		let word1Transition = this.animate({
			node:		w1,
			rules:		{
				timing:		'ease-in-out',
				duration:	2200,
				name:		'flutterLeft'
			}
		});

		let word2Transition = this.animate({
			node:		w2,
			rules:		{
				timing:		'ease-in-out',
				duration:	2200,
				name:		'flutterStraight'
			}
		});

		let word3Transition = this.animate({
			node:		w3,
			rules:		{
				timing:		'ease-in-out',
				duration:	1700,
				name:		'flutterRight'
			}
		});

		await word3Transition;

		title.style.visibility = 'hidden';

		await Promise.all([ logoTransition, crossTransition, crossCloneTransition, gridTransition, menuTransition, word1Transition, word2Transition, word3Transition ]);

		this.addNodeEventOnce( 'a.revealIntro', 'click', this.returnToMenu );
	}

	async returnToMenu( event ) {
		let {	myVideo,
				w1,
				w2,
				w3,
				crossClone,
				'a.revealIntro':revealIntro,
				'li.homeContainer':logo,
				'li.jumpListContainer':menu,
				'li.titleContainer':title,
				'div.gridOverlay':gridOverlay } = this.nodes;

		this.removeNodeEvent( crossClone, 'click' );

		title.style.visibility = 'visible';

		myVideo.classList.add( 'darken' );
		myVideo.controls	= false;

		new VideoTools( myVideo ).fadeVolumeOut();

		crossClone.textContent = '\u2720';
		crossClone.classList.remove( 'replaySymbol' );
		revealIntro.textContent = '\u2720';
		revealIntro.classList.remove( 'returnSymbol' );

		await Promise.all( [ w1, w2, w3, revealIntro, gridOverlay, crossClone, logo, menu ].map( node => this.data.get( node ).storage.animations.last.undo() ) );

		this.removeNodes( 'crossClone', true );
		this.addNodeEventOnce( revealIntro, 'click', this.showIntro );
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
