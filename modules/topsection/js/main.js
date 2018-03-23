'use strict';

import { Component } from 'barfoos2.0/core.js';
import Swipe from 'barfoos2.0/swipe.js';
import { extend, mix } from 'barfoos2.0/toolkit.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { loadVideo } from 'video.js';

import html from '../markup/main.html';
import scrollUpMarkup from '../markup/scrollup.html';
import quickNavMarkup from '../markup/quicknav.html';
import style from '../style/main.scss';
import scrollUpStyle from '../style/scrollup.scss';
import quickNavStyle from '../style/quicknav.scss';
import transforms from '../style/transforms.scss';

import * as videoSection from 'videoSection/js/main.js';

/*****************************************************************************************************
 * Class TopSection inherits from BarFoos Component, GUI Module
 *****************************************************************************************************/
class topSection extends mix( Component ).with( Swipe ) {
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
			videoLink:				'/_video/intro_,108,72,48,36,0.mp4.urlset/master.m3u8',
			fallbackPath:			'/fallback/_video/intro_480.mp4',
			backgroundVideo:		null,
			isTheaterMode:			false
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

		this.addNodeEventOnce( 'a.revealIntro', 'click touchstart', this.showIntro );
		this.addNodeEventOnce( 'a.slideDownArrow', 'animationend', this.slideDownArrowAnimationEnd );
		this.addNodeEvent( 'a.slideDownArrow', 'mousedown touchstart', this.slideDownArrowClick );
		this.addNodeEvent( 'a.followMe', 'click touchstart', this.followMeClick );
		this.addNodeEvent( 'a.jumpToVideoSection', 'click touchstart', this.onSwipeDown );
		this.addNodeEvent( 'a.jumpToAboutSection', 'click touchstart', this.slideToAboutMeSection );
		this.addNodeEvent( 'a.jumpToSupportSection', 'click touchstart', this.slideToSupportSection );

		this.on( 'getSiteNavigation.appEvents', this.getSiteNavigation, this );
		this.on( 'remoteNavigate.appEvents', this.navigateTo, this );

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style, scrollUpStyle, quickNavStyle, transforms ].forEach( s => s.unuse() );
	}

	async onBackgroundImageLoaded() {
		try {
			this.backgroundVideo = await loadVideo({
				videoLink:		this.videoLink,
				videoElement:	this.nodes[ 'video.introduction' ],
				fallbackPath:	this.fallbackPath,
				silenced:		true
			});

			let res = await this.backgroundVideo.play();

			if( res === -1 ) {
				throw new Error( 'Unable to playback video, most likely because of webkit video security.' );
			}
		} catch( ex ) {
			this.mobileSafariMode = true;
			this.backgroundVideo.stop();
			this.nodes[ 'li.WatchIntroContainer' ].style.visibility = 'hidden';
		}

		this.on( 'appVisibilityChange.appEvents appFocusChange.appEvents', ( active ) => {
			if( active && this.backgroundVideo.paused ) {
				this.backgroundVideo.play();
			}

			if(!active && !this.backgroundVideo.paused) {
				this.backgroundVideo.pause();
			}
		});
	}

	async inViewport() {
		await Promise.all([ this.returnToMenuComplete, this.transitionToTheaterComplete, ...this.data.get( this.nodes.myVideo ).storage.animations.running ]);
		this.removeNodes( 'div.quickScrollUp', true );
		this.removeNodes( 'div.quickNav', true );

		if(!this._dialogMode ) {
			if( this.backgroundVideo && this.backgroundVideo.stopped ) {
				await this.startVideoPlayback();
			}
		}
	}

	async offViewport() {
		await Promise.all([ this.returnToMenuComplete, this.transitionToTheaterComplete, ...this.data.get( this.nodes.myVideo ).storage.animations.running ]);
		this.addNodes({
			htmlData:	scrollUpMarkup,
			reference:	{
				node:		'root',
				position:	'beforeend'
			}
		});

		this.addNodes({
			htmlData:	quickNavMarkup,
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
	}

	// referenced via html markup, interpretated and linked by cacheNodes
	async onQuickScrollUpClick() {
		await this.fire( 'slideUpTo.appEvents', this.nodes.root );
	}

	async onQuickNavClick() {
		this.removeNodes( 'div.quickNav', true );

		await this.fire( 'mobileNavigationSection.launchModule' );
		this.fire( 'requestMobileNavigation.core' );
	}

	slideDownArrowAnimationEnd( event ) {
		event.target.classList.remove( 'initialBounce' );
	}

	async onDialogModeChange( active ) {
		this.removeNodes( 'div.quickNav', true );

		if( this.mobileSafariMode ) {
			if(!active ) {
				this.addNodeEvent( 'a.followMe', 'click touchstart', this.followMeClick );
			}

			super.onDialogModeChange && super.onDialogModeChange( active );
			return;
		}

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
		if( this.backgroundVideo && this._insightViewport ) {
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
		this.onSwipeDown();
	}

	async followMeClick( event ) {
		event.stopPropagation();
		event.preventDefault();

		this.removeNodeEvent( 'a.followMe', 'click touchstart', this.followMeClick );

		await Promise.all( this.data.get( this.nodes.myVideo ).storage.animations.running );

		let registerEmailDialog = await import( /* webpackChunkName: "RegisterEmail Dialog" */ 'registerEmailDialog/js/main.js'  );

		await registerEmailDialog.start({
			location:	this.id
		});
	}

	async slideToAboutMeSection( event ) {
		await this.fire( 'aboutMeSection.launchModule' );

		this.fire( 'slideDownTo.aboutMeSection' );

		event.stopPropagation();
		event.preventDefault();
	}

	async slideToSupportSection( event ) {
		await this.fire( 'supportSection.launchModule' );

		this.fire( 'slideDownTo.supportSection' );

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

			this.removeNodeEvent( 'a.slideDownArrow', 'mousedown touchstart', this.slideDownArrowClick );

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

			this.addNodeEventOnce( 'a.revealIntro', 'click touchstart', this.returnToMenu );
			this.addNodeEvent( 'a.slideDownArrow', 'mousedown touchstart', this.slideDownArrowClick );

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

			this.removeNodeEvent( 'a.slideDownArrow', 'mousedown touchstart', this.slideDownArrowClick );
			this.removeNodeEvent( crossClone, 'click' );

			title.style.visibility = 'visible';

			myVideo.classList.add( 'darken' );

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
			this.addNodeEvent( 'a.slideDownArrow', 'mousedown touchstart', this.slideDownArrowClick );

			completeRes();
		});

		return this.returnToMenuComplete;
	}

	getSiteNavigation() {
		let dataList = Array.from( this.nodes[ 'ul.jumpList' ].querySelectorAll( 'li > a' ) ).map( anchor => {
			let lookup		= Object.create( null );
			lookup.id		= 'a.'+anchor.className;
			lookup.title	= anchor.textContent;
			return lookup;
		});

		return dataList;
	}

	async navigateTo( data = { } ) {
		if( Object.keys( data ).length ) {
			this.data.get( this.nodes[ data.id ] ).events[ 'touchstart' ][ 0 ].call( this, data.event );
		}

		if(!this.nodes[ 'div.quickNav' ] ) {
			this.addNodes({
				htmlData:	quickNavMarkup,
				reference:	{
					node:		'root',
					position:	'beforeend'
				}
			});
		}
	}
}
/****************************************** TopSection End ******************************************/

/*****************************************************************************************************
 *  Entry point for this GUI Module.
 *****************************************************************************************************/
async function start( ...args ) {
	[ transforms, style, scrollUpStyle, quickNavStyle ].forEach( style => style.use() );

	let topSectionLoading		= new topSection( ...args ),
		videoSectionLoading		= videoSection.start();

	return Promise.all([ topSectionLoading, videoSectionLoading ]);
}

export { start };
