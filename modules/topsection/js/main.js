'use strict';

import { Component } from 'barfoos2.0/core.js';
import Swipe from 'barfoos2.0/swipe.js';
import { extend, mix } from 'barfoos2.0/toolkit.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { loadVideo } from 'video.js';

import html from '../markup/main.html';
import scrollUpMarkup from '../markup/scrollup.html';
import style from '../style/main.scss';
import scrollUpStyle from '../style/scrollup.scss';
import transforms from '../style/transforms.scss';

const	videoLink		= '/_video/intro_,108,72,48,36,0.mp4.urlset/master.m3u8',
		fallbackPath	= '/fallback/intro_480.mp4';

let instance = null;

/*****************************************************************************************************
 * Class TopSection inherits from BarFoos Component, GUI Module
 *****************************************************************************************************/
class TopSection extends mix( Component ).with( Swipe ) {
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
			backgroundVideo:		null,
			isTheaterMode:			false,
			outOfViewport:			false
		});

		return this.init();
	}

	async init() {
		try {
			await super.init();
			await this.fire( 'waitForBackgroundImageLoaded.appEvents' );
			await this.onBackgroundImageLoaded();
		} catch( ex ) {
			this.log( 'Error on initializing, module might not be fully available -> ', ex );
		}

		this.addNodeEventOnce( 'a.revealIntro', 'click', this.showIntro );
		this.addNodeEventOnce( 'a.slideDownArrow', 'animationend', this.slideDownArrowAnimationEnd );
		this.addNodeEvent( 'a.slideDownArrow', 'mousedown touchstart', this.slideDownArrowClick );
		this.addNodeEvent( 'a.followMe', 'click touchstart', this.followMeClick );
		this.addNodeEvent( 'a.jumpToVideoSection', 'click touchstart', this.onSwipeDown );

		this.on( 'slideUp.videoSection', this.onSlideUp, this );
		this.on( 'centerScroll.appEvents', this.onCenterScroll, this );

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style, scrollUpStyle, transforms ].forEach( s => s.unuse() );
	}

	async onBackgroundImageLoaded() {
		this.backgroundVideo = await loadVideo( videoLink, this.nodes[ 'video.introduction' ], fallbackPath );

		this.on( 'appVisibilityChange.appEvents appFocusChange.appEvents', ( active ) => {
			if( active && this.backgroundVideo.paused ) {
				this.backgroundVideo.play();
			}

			if(!active && !this.backgroundVideo.paused) {
				this.backgroundVideo.pause();
			}
		});
	}

	async onCenterScroll( data ) {
		if( data.offsetTop >= data.innerHeight/2 && this.outOfViewport === false ) {
			this.outOfViewport = true;

			await Promise.all([ this.returnToMenuComplete, this.transitionToTheaterComplete, ...this.data.get( this.nodes.myVideo ).storage.animations.running ]);
			this.addNodes({
				htmlData:	scrollUpMarkup,
				reference:	{
					node:		'root',
					position:	'beforeend'
				}
			});

			if(!this._dialogMode ) {
				if( this.isTheaterMode ) {
					this.returnToMenu();
				}

				this.stopVideoPlayback();
			}
		} else if( data.offsetTop < data.innerHeight/2 && this.outOfViewport ) {
			this.outOfViewport = false;

			await Promise.all([ this.returnToMenuComplete, this.transitionToTheaterComplete, ...this.data.get( this.nodes.myVideo ).storage.animations.running ]);
			this.removeNodes( 'div.quickScrollUp', true );

			if(!this._dialogMode ) {
				if( this.backgroundVideo.stopped ) {
					await this.startVideoPlayback();
				}
			}
		}
	}

	async onQuickScrollUpClick() {
		this.fire( 'slideUpTo.appEvents', this.nodes.root );
	}

	onSlideUp() {
		this.fire( 'slideUpTo.appEvents', this.nodes.root );
	}

	onSwipeDown() {
		this.fire( 'slideDown.topSection' );
	}

	slideDownArrowAnimationEnd( event ) {
		event.target.classList.remove( 'initialBounce' );
	}

	async onDialogModeChange( active ) {
		await Promise.all( this.data.get( this.nodes.myVideo ).storage.animations.running );

		if( active ) {
			this.nodes[ 'a.revealIntro' ].style.visibility = 'hidden';

			if( this.nodes.crossClone ) {
				this.nodes.crossClone.style.visibility = 'hidden';
			}

			if( this.isTheaterMode ) {
				this.removeNodeEvent( 'a.revealIntro', 'click', this.returnToMenu );
				this.returnToMenu();
			}
		} else {
			this.nodes[ 'a.revealIntro' ].style.visibility = 'visible';
			this.addNodeEvent( 'a.followMe', 'click touchstart', this.followMeClick );

			if( this.nodes.crossClone ) {
				this.nodes.crossClone.style.visibility = 'visible';
			}
		}


		if( active ) {
			await this.stopVideoPlayback();
		} else {
			await this.startVideoPlayback();
		}

		super.onDialogModeChange && super.onDialogModeChange( active );
	}

	async stopVideoPlayback() {
		if( this.backgroundVideo ) {
			this.lastPlaybackTime = this.backgroundVideo.getTime || 1;
			this.backgroundVideo.stop();

			await Promise.all( this.data.get( this.nodes.myVideo ).storage.animations.running );
			await this.animate({
				node:	this.nodes.myVideo,
				rules:	{
					duration:	400,
					name:		'fadeOut'
				}
			});

			this.nodes.myVideo.style.display = 'none';
		}
	}

	async startVideoPlayback() {
		if( this.backgroundVideo && !this.outOfViewport ) {
			this.nodes.myVideo.style.display = 'block';

			this.backgroundVideo.play( this.lastPlaybackTime );

			try {
				await this.data.get( this.nodes.myVideo ).storage.animations.last.undo();
			} catch( ex ) {
				/* unidentified random error, not handled yet */
			}
		}
	}

	async slideDownArrowClick() {
		this.fire( 'slideDown.topSection' );
	}

	async followMeClick( event ) {
		this.removeNodeEvent( 'a.followMe', 'click touchstart', this.followMeClick );

		await Promise.all( this.data.get( this.nodes.myVideo ).storage.animations.running );

		let registerEmailDialog = await import( /* webpackChunkName: "RegisterEmail Dialog" */ 'registerEmailDialog/js/main.js'  );

		registerEmailDialog.start({
			location:	this.id
		});

		event.stopPropagation();
		event.preventDefault();
	}

	async showIntro() {
		if( this.isTheaterMode ) {
			return;
		}

		this.isTheaterMode = true;

		this.transitionToTheaterComplete = new Promise(async ( completeRes, completeRej ) => {
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
			} else {
				this.nodes[ 'video.introduction' ].src = '';
				this.backgroundVideo = await loadVideo( videoLink, this.nodes[ 'video.introduction' ], fallbackPath );
				this.backgroundVideo.play();
				console.log('readyState: ',this.nodes[ 'video.introduction' ].readyState );

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

			completeRes();
		});

		return this.transitionToTheaterComplete;
	}

	async returnToMenu() {
		if(!this.isTheaterMode ) {
			return;
		}

		this.isTheaterMode = false;

		this.returnToMenuComplete = new Promise(async ( completeRes, completeRej ) => {
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

			completeRes();
		});

		return this.returnToMenuComplete;
	}
}
/****************************************** TopSection End ******************************************/

/*****************************************************************************************************
 *  Entry point for this GUI Module.
 *****************************************************************************************************/
async function start( ...args ) {
	[ transforms, style, scrollUpStyle ].forEach( style => style.use() );

	instance = await new TopSection( ...args );
}

function stop() {
	[ style ].forEach( style => style.unuse() );

	if( instance ) {
		instance.destroy();
	}
}

export { start, stop };
