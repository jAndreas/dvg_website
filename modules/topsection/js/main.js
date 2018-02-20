'use strict';

import { Component } from 'barfoos2.0/core.js';
import { extend } from 'barfoos2.0/toolkit.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { loadVideo, reInitHLSJS, VideoTools } from 'video.js';

//import io from 'socket.io-client';
import html from '../markup/main.html';
import style from '../style/main.scss';
import transforms from '../style/transforms.scss';

const	videoLink		= '/video/intro_,108,72,48,36,0.mp4.urlset/master.m3u8',
		fallbackPath	= '/fallback/intro_480.mp4';

/*var socket = io( 'http://judgemy.org' );

socket.emit('echo', 'oh my.. wtf!!');
socket.on('pongo', ( data ) => {
	console.log( 'recv from server: ', data );
});*/

let instance = null;

/*****************************************************************************************************
 * Class TopSection inherits from BarFoos Component, GUI Module
 *****************************************************************************************************/
class TopSection extends Component {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			location:		moduleLocations.center,
			tmpl:			html
		}).and( input );

		super( options );

		this.runtimeDependencies.push(
			this.fire( 'waitforHLSSupport.appEvents' )
		);

		extend( this ).with({
			backgroundVideo:null
		});

		return this.init();
	}

	async init() {
		await super.init();

		await this.fire( 'waitForBackgroundImageLoaded.appEvents' );

		this.onBackgroundImageLoaded();

		this.addNodeEventOnce( 'a.revealIntro', 'click', this.showIntro );
		this.addNodeEventOnce( 'a.slideDownArrow', 'animationend', this.slideDownArrowAnimationEnd );
		this.addNodeEvent( 'a.slideDownArrow', 'mousedown touchstart', this.slideDownArrowClick );
		this.addNodeEvent( 'a.followMe', 'mousedown touchstart', this.followMeClick );
		this.addNodeEvent( 'ul.jumpList', 'mousedown', this.notYet );

		return this;
	}

	async onBackgroundImageLoaded() {
		//if( true ) {
			this.backgroundVideo = await loadVideo( videoLink, this.nodes[ 'video.introduction' ], fallbackPath );

			this.on( 'appVisibilityChange.appEvents appFocusChange.appEvents', ( active, event ) => {
				if( active && this.backgroundVideo.paused ) {
					this.backgroundVideo.play();
				}

				if(!active && !this.backgroundVideo.paused) {
					this.backgroundVideo.pause();
				}
			});
		//}
	}

	slideDownArrowAnimationEnd( event ) {
		event.target.classList.remove( 'initialBounce' );
	}

	notYet( event ) {
		if( event.srcElement !== this.nodes[ 'a.followMe' ] ) {
			alert('Geduld, bald ist es soweit! Bitte abonniere trotzem bereits jetzt, ich werde Euch informieren, wenn es hier richtig los geht!');
			this.followMeClick.call( this, event );
		}

		return false;
	}

	async onDialogModeChange( active ) {
		await Promise.all( this.data.get( this.nodes.myVideo ).storage.animations.running );

		if( active ) {
			this.nodes[ 'a.revealIntro' ].style.visibility = 'hidden';

			if( this.nodes.crossClone ) {
				this.nodes.crossClone.style.visibility = 'hidden';
			}

			if(!this.nodes.myVideo.classList.contains( 'darken' ) ) {
				this.removeNodeEvent( 'a.revealIntro', 'click', this.returnToMenu );
				this.returnToMenu();
			}
		} else {
			this.nodes[ 'a.revealIntro' ].style.visibility = 'visible';
			this.addNodeEvent( 'a.followMe', 'mousedown touchstart', this.followMeClick );

			if( this.nodes.crossClone ) {
				this.nodes.crossClone.style.visibility = 'visible';
			}
		}

		if( this.backgroundVideo ) {
			if( active ) {
				this.lastPlaybackTime = this.backgroundVideo.getTime;
				this.backgroundVideo.stop();

				await this.animate({
					node:	this.nodes.myVideo,
					rules:	{
						duration:	400,
						name:		'fadeOut'
					}
				});

				this.nodes.myVideo.style.display = 'none';
			} else {
				this.nodes.myVideo.style.display = 'block';

				await this.data.get( this.nodes.myVideo ).storage.animations.last.undo();

				this.backgroundVideo.play( this.lastPlaybackTime );
			}
		}

		super.onDialogModeChange && super.onDialogModeChange( active );
	}

	async slideDownArrowClick( event ) {

	}

	async followMeClick( event ) {
		this.removeNodeEvent( 'a.followMe', 'mousedown touchstart', this.followMeClick );

		await Promise.all( this.data.get( this.nodes.myVideo ).storage.animations.running );

		let registerEmailDialog = await import( /* webpackChunkName: "RegisterEmail Dialog" */ 'registerEmailDialog/js/main.js'  );

		registerEmailDialog.start({
			location:	this.id
		});

		event.stopPropagation();
		event.preventDefault();
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

		this.removeNodeEvent( 'a.slideDownArrow', 'mousedown', this.slideDownArrowClick );

		if( this.backgroundVideo ) {
			this.backgroundVideo.fadeVolumeIn();
		}

		this.addNodes({
			nodeData:	revealIntro.cloneNode( true ),
			nodeName:	'crossClone',
			reference:	{
				node:		revealIntro,
				position:	'afterend'
			}
		});

		this.nodes.crossClone.classList.add( 'clone' );

		this.addNodeEvent( this.nodes.crossClone, 'click', () => {
			if( this.backgroundVideo ) {
				this.backgroundVideo.seek( 2 );
			}

			this.addNodes({
				htmlData:	'<div class="ROFLSUPERHARD">I am the hard ROFLer!!!</div>',
				reference:	{
					node:		'a.slideDownArrow',
					position:	'afterend'
				}
			});
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
		this.addNodeEvent( 'a.slideDownArrow', 'mousedown', this.slideDownArrowClick );
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

		this.removeNodeEvent( 'a.slideDownArrow', 'mousedown', this.slideDownArrowClick );
		this.removeNodeEvent( crossClone, 'click' );

		title.style.visibility = 'visible';

		myVideo.classList.add( 'darken' );
		myVideo.controls	= false;

		if( this.backgroundVideo ) {
			this.backgroundVideo.fadeVolumeOut();
		}

		crossClone.textContent = '\u2720';
		crossClone.classList.remove( 'replaySymbol' );
		revealIntro.textContent = '\u2720';
		revealIntro.classList.remove( 'returnSymbol' );

		await Promise.all( [ w1, w2, w3, revealIntro, gridOverlay, crossClone, logo, menu ].map( node => this.data.get( node ).storage.animations.last.undo() ) );

		this.removeNodes( 'crossClone', true );
		this.addNodeEventOnce( revealIntro, 'click', this.showIntro );
		this.addNodeEvent( 'a.slideDownArrow', 'mousedown', this.slideDownArrowClick );
	}
}
/****************************************** TopSection End ******************************************/

/*****************************************************************************************************
 *  Entry point for this GUI Module.
 *****************************************************************************************************/
async function start( ...args ) {
	[ transforms, style ].forEach( style => style.use() );

	instance = await new TopSection( ...args );
}

function stop() {
	[ style ].forEach( style => style.unuse() );

	if( instance ) {
		instance.destroy();
	}
}

export { start, stop };
