'use strict';

import { Component } from 'barfoos2.0/core.js';
import { extend, mix, getTimePeriod, isMobileDevice } from 'barfoos2.0/toolkit.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { loadVideo } from 'video.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

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
class topSection extends mix( Component ).with( ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:			'topSection',
			location:		moduleLocations.center,
			tmpl:			html,
			renderData:		{ backgroundVideo: (input.backgroundVideo === null || input.backgroundVideo === 'enabled') ? 'checked' : '' }
		}).and( input );

		super( options );

		this.runtimeDependencies.push(
			this.fire( 'waitforHLSSupport.appEvents' )
		);

		extend( this ).with({
			//videoLink:				'/_video/intro_,108,72,48,36,0.mp4.urlset/master.m3u8',
			videoLink:				'/_video/intro_,72,48,36,0.mp4.urlset/master.m3u8',
			fallbackPath:			'/fallback/_video/intro_480.mp4',
			backgroundVideo:		null,
			isTheaterMode:			false,
			_waitingUsers:			[ ]
		});

		return this.init();
	}

	async init() {
		try {
			await super.init();

			if( this.DOMParsingSpeed < 500 ) {
				await this.fire( 'waitForBackgroundImageLoaded.appEvents' );

				if(!this.skipInitialVideo ) {
					await this.onBackgroundImageLoaded();
				}
			} else {
				this.nodes[ 'div.gridOverlay' ].style.visibility = 'hidden';
			}
		} catch( ex ) {
			this.log( 'Error on initializing, module might not be fully available -> ', ex );
		}

		this.addNodeEventOnce( 'a.revealIntro', 'click', this.showIntro );
		this.addNodeEventOnce( 'a.slideDownArrow', 'animationend', this.slideDownArrowAnimationEnd );
		this.addNodeEvent( 'a.slideDownArrow', 'mousedown', this.slideDownArrowClick );
		this.addNodeEvent( 'a.followMe', 'click', this.followMeClick );
		this.addNodeEvent( 'a.jumpToVideoSection','click', this.slideDownArrowClick );
		this.addNodeEvent( 'a.jumpToArticleSection','click', this.slideToArticleSection );
		this.addNodeEvent( 'a.jumpToAboutSection', 'click', this.slideToAboutMeSection );
		this.addNodeEvent( 'a.jumpToSupportSection', 'click', this.slideToSupportSection );
		this.addNodeEvent( 'div.registerName', 'click', this.onRegisterName );
		this.addNodeEvent( 'div.login', 'click', this.onLoginClick );
		this.addNodeEvent( 'div.logout', 'click', this.onLogoutClick );
		this.addNodeEvent( 'div.startLiveChat', 'click', this.startLiveChat );
		this.addNodeEvent( 'input#disabledBackgroundVideo', 'change', this.disabledBackgroundVideo );

		this.on( 'getSiteNavigation.appEvents', this.getSiteNavigation, this );
		this.on( 'remoteNavigate.appEvents', this.navigateTo, this );
		this.on( 'userLogin.server', this.onUserLogin, this );
		this.on( 'sessionLogin.appEvents', this.onSessionLogin, this );
		this.on( 'moduleDestruction.appEvents', this.onModuleDestruction, this );
		this.on( 'notifyUserAboutMessage.chat', this.personalChatMessage, this );
		this.on( 'openLiveChat.appEvents', this.startLiveChat, this );

		this.fire( 'checkSession.appEvents' );

		this.recv( 'heArrived', this.heArrived.bind( this ) );
		this.recv( 'heLeft', this.heLeft.bind( this ) );

		let conn = this.fire( 'waitForConnection.server' );

		if( conn === true ) {
			this.checkAdmin();
		} else {
			conn.then( this.checkAdmin.bind( this ) );
		}

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style, scrollUpStyle, quickNavStyle, transforms ].forEach( s => s.unuse() );
	}

	async onBackgroundImageLoaded() {
		try {
			if( isMobileDevice ) {
				return;
			}

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

			this.nodes[ 'div.gridOverlay' ].style.display = 'block';

			this.on( 'appVisibilityChange.appEvents appFocusChange.appEvents', ( active ) => {
				if( active && this.backgroundVideo.paused ) {
					this.backgroundVideo.play();
				}

				if(!active && !this.backgroundVideo.paused) {
					this.backgroundVideo.pause();
				}

				return false;
			});
		} catch( ex ) {
			this.mobileSafariMode = true;
			this.backgroundVideo.stop();
			this.nodes[ 'li.WatchIntroContainer' ].style.visibility = 'hidden';
			return false;
		}
	}

	async inViewport() {
		await Promise.all([ this.returnToMenuComplete, this.transitionToTheaterComplete, ...this.data.get( this.nodes.myVideo ).storage.animations.running ]);
		this.removeNodes( 'div.quickScrollUp', true );
		this.removeNodes( 'div.quickNav', true );

		if(!this._dialogMode ) {
			if( this.nodes[ 'input#disabledBackgroundVideo' ].checked && this.backgroundVideo && this.backgroundVideo.stopped ) {
				await this.startVideoPlayback();
			}
		}

		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		this.name,
				ref:		this.name
			}
		});

		this.nodes[ 'div.gridOverlay' ].style.backgroundImage = '';
		this.nodes[ 'div.setupBackgroundVideo' ].style.display = 'flex';

		super.inViewport && super.inViewport( ...arguments );
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

		if( this.mobileSafariMode ) {
			this.addNodes({
				htmlData:	quickNavMarkup,
				reference:	{
					node:		'root',
					position:	'beforeend'
				}
			});
		}

		if(!this._dialogMode ) {
			if( this.isTheaterMode ) {
				this.returnToMenu();
			}

			this.stopVideoPlayback();
		}

		this.nodes[ 'div.gridOverlay' ].style.backgroundImage = 'none';
		this.nodes[ 'div.setupBackgroundVideo' ].style.display = 'none';

		super.offViewport && super.offViewport( ...arguments );
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

	async disabledBackgroundVideo() {
		if( this.nodes[ 'input#disabledBackgroundVideo' ].checked ) {
			if( this.backgroundVideo === null ) {
				await this.onBackgroundImageLoaded();
			}

			this.startVideoPlayback();
			localStorage.setItem( 'dvgBackgroundVideo', 'enabled' );
		} else {
			this.stopVideoPlayback();
			localStorage.setItem( 'dvgBackgroundVideo', 'disabled' );
		}
	}

	async onRegisterName( event ) {
		event.stopPropagation();
		event.preventDefault();
		this.removeNodeEvent( 'div.registerName', 'click', this.onRegisterName );

		await Promise.all( this.data.get( this.nodes.myVideo ).storage.animations.running );

		let clRect			= this.nodes[ 'div.userOptions' ].getBoundingClientRect(),
			position		= Object.create( null );

			position.top	= clRect.bottom+2;
			position.left	= clRect.left;

		let registerDialog	= await import( /* webpackChunkName: "registerDialog" */  'registerDialog/js/main.js'  );

		await registerDialog.start({
			location:	this.id,
			position:	position,
			center:		this.mobileSafariMode
		});
	}

	async onLoginClick( event ) {
		event.stopPropagation();
		event.preventDefault();

		this.removeNodeEvent( 'div.login', 'click', this.onLoginClick );

		//await Promise.all( this.data.get( this.nodes.myVideo ).storage.animations.running );

		let clRect			= this.nodes[ 'div.userOptions' ].getBoundingClientRect(),
			position		= Object.create( null );

			position.top	= clRect.bottom+2;
			position.left	= clRect.left;

		let loginDialog		= await import( /* webpackChunkName: "loginDialog" */  'loginDialog/js/main.js'  );

		await loginDialog.start({
			location:	this.id,
			position:	position,
			center:		this.mobileSafariMode
		});
	}

	async onLogoutClick( event ) {
		event.stopPropagation();
		event.preventDefault();

		this.removeNodeEvent( 'div.logout', 'click', this.onLogoutClick );

		try {
			let response = await this.send({
				type:		'logoutUser',
				payload:	{ }
			});

			if( response.data.sessionDestroyed ) {
				this.fire( 'userLogout.server', response.data.session );

				this.nodes[ 'div.logout' ].style.display = 'none';
				this.nodes[ 'div.logout' ].removeAttribute( 'title' );

				this.nodes[ 'div.login' ].style.display = 'flex';
				this.nodes[ 'div.registerName' ].style.display = 'flex';

				this.addNodeEvent( 'div.login', 'click', this.onLoginClick );
				this.addNodeEvent( 'div.registerName', 'click', this.onRegisterName );
			}
		} catch( ex ) {
			this.log( 'logoutUser error: ', ex );
		}

		this.addNodeEvent( 'div.logout', 'click', this.onLogoutClick );
	}

	async checkAdmin() {
		let isHe = await this.send({ type: 'isHeOnline'  });

		if( isHe.online ) {
			this.nodes[ 'div.startLiveChat' ].classList.add( 'omgItsHim' );
		}
	}

	async heArrived() {
		this.nodes[ 'div.startLiveChat' ].classList.add( 'omgItsHim' );
		this.nodes[ 'div.startLiveChat' ].setAttribute( 'title', 'Der Vegane Germane ist gerade online!' );
	}

	async heLeft() {
		this.nodes[ 'div.startLiveChat' ].classList.remove( 'omgItsHim' );
		this.nodes[ 'div.startLiveChat' ].setAttribute( 'title', 'Live Chat' );
	}

	async startLiveChat( event ) {
		if( 'stopPropagation' in event ) {
			event.stopPropagation();
			event.preventDefault();
		}

		this.removeNodeEvent( 'div.startLiveChat', 'click', this.startLiveChat );

		this.nodes[ 'div.startLiveChat' ].classList.remove( 'shake' );
		this.nodes[ 'div.startLiveChat' ].removeEventListener('animationiteration', this._boundShakeAnimationStart, false );

		let clRect			= this.nodes[ 'div.userOptions' ].getBoundingClientRect(),
			position		= Object.create( null );

			position.top	= clRect.bottom+2;
			position.left	= clRect.left;

		let liveChatDialog	= await import( /* webpackChunkName: "liveChatDialog" */  'liveChatDialog/js/main.js'  );

		await liveChatDialog.start({
			position:		position,
			center:			this.mobileSafariMode,
			pingMessages:	this._waitingUsers
		});

		this._waitingUsers = [ ];
	}

	slideDownArrowAnimationEnd( event ) {
		event.target.classList.remove( 'initialBounce' );
	}

	async onDialogModeChange( active ) {
		if( this.mobileSafariMode ) {
			if( active ) {
				if( this.nodes[ 'div.quickNav' ] ) {
					this.removeNodes( 'div.quickNav', true );
				}
			} else {
				if(!this._insightViewport ) {
					this.addNodes({
						htmlData:	quickNavMarkup,
						reference:	{
							node:		'root',
							position:	'beforeend'
						}
					});
				}
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
			this.nodes[ 'div.gridOverlay' ].style.visibility = 'hidden';
		}
	}

	async startVideoPlayback() {
		if( this.backgroundVideo && this._insightViewport && this.nodes[ 'input#disabledBackgroundVideo' ].checked ) {
			this.nodes[ 'div.gridOverlay' ].style.visibility = 'visible';
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
		this.fire( 'slideDownArrayClicked.topSection' );
	}

	async followMeClick( event ) {
		event.stopPropagation();
		event.preventDefault();

		this.removeNodeEvent( 'a.followMe', 'click', this.followMeClick );

		await Promise.all( this.data.get( this.nodes.myVideo ).storage.animations.running );

		let registerEmailDialog		= await import( /* webpackChunkName: "RegisterEmailDialog" */ 'registerEmailDialog/js/main.js'  );

		await registerEmailDialog.start({
			location:	this.id
		});
	}

	async slideToArticleSection( event ) {
		event.stopPropagation();
		event.preventDefault();

		await this.fire( 'articleSection.launchModule' );

		this.fire( 'slideDownTo.articleSection' );
	}

	async slideToAboutMeSection( event ) {
		event.stopPropagation();
		event.preventDefault();

		await this.fire( 'aboutMeSection.launchModule' );

		this.fire( 'slideDownTo.aboutMeSection' );
	}

	async slideToSupportSection( event ) {
		event.stopPropagation();
		event.preventDefault();

		await this.fire( 'supportSection.launchModule' );

		this.fire( 'slideDownTo.supportSection' );
	}

	async showIntro() {
		if( this.isTheaterMode ) {
			return;
		}

		if( this.skipInitialVideo && this.backgroundVideo === null ) {
			await this.onBackgroundImageLoaded();
		}

		this.isTheaterMode = true;

		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		'watchIntro'
			}
		});

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

		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		this.name
			}
		});

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

	getSiteNavigation() {
		let dataList = Array.from( this.nodes[ 'ul.jumpList' ].querySelectorAll( 'li > a' ) ).map( elem => {
			let lookup			= Object.create( null );
			lookup.id			= this.resolveNodeNameFromRef( elem );
			lookup.title		= elem.textContent;
			lookup.mobileStyle	= elem.dataset.mobileStyle || '';
			lookup.mobileFlags	= elem.dataset.mobileFlags || '';
			lookup.mobileTitle	= elem.dataset.mobileTitle || '';
			return lookup;
		});

		let loginList = Array.from( this.nodes[ 'div.userOptions' ].querySelectorAll( 'div' ) ).map( elem => {
			let lookup			= Object.create( null );
			lookup.id			= this.resolveNodeNameFromRef( elem );
			lookup.title		= elem.textContent;
			lookup.mobileStyle	= elem.dataset.mobileStyle || '';
			lookup.mobileFlags	= elem.dataset.mobileFlags || '';
			lookup.mobileTitle	= elem.dataset.mobileTitle || '';
			return lookup;
		});

		return [ ...dataList, ...loginList ];
	}

	async navigateTo( data = { } ) {
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

	async onUserLogin( user ) {
		this.log('login data: ', user);

		this.fire( 'startNewSession.server', user );
		this.nodes[ 'div.login' ].style.display = 'none';
		this.nodes[ 'div.registerName' ].style.display = 'none';
		this.nodes[ 'div.logout' ].style.display = 'flex';
		this.nodes[ 'div.logout' ].setAttribute( 'title', `${ user.__username } ausloggen...` );

		this.inViewport();
	}

	async onSessionLogin( user ) {
		try {
			let response = await this.send({
				type:		'verifySession',
				payload:	user
			});

			if( response.data.verified ) {
				this.onUserLogin( user );
			}
		} catch( ex ) {
			this.log( 'onSessionLogin: ', ex );
		}
	}

	async personalChatMessage( data ) {
		let isChatAvailable = await this.fire( 'findModule.liveChatDialog' );

		if( isChatAvailable !== true ) {
			this._waitingUsers.push( data );

			this._boundShakeAnimationStart = this.shakeAnimationStart.bind( this );

			if( this.nodes[ 'div.startLiveChat' ].classList.contains( 'shake' ) === false ) {
				this.nodes[ 'div.startLiveChat' ].classList.add( 'shake' );
				this.nodes[ 'div.startLiveChat' ].addEventListener('animationiteration', this._boundShakeAnimationStart, false );
			}
		}
	}

	shakeAnimationStart( event ) {
		/* create element, animate fade fly-away from chat shaking button with messages */
		let len		= this._waitingUsers.length,
			rndMsg	= this._waitingUsers[ ~~(Math.random() * len) ];

		let hash	= this.render({ htmlData: '<div class="rndPreviewMessage">%from% schrieb vor %time%: <div class="content">%content%</div></div>', standalone: true }).with({
			from:		rndMsg.from,
			time:		getTimePeriod( rndMsg.time ),
			content:	rndMsg.content
		}).at({
			node:		'div.startLiveChat',
			position:	'beforeend'
		});

		hash.localRoot.addEventListener('animationend', () => {
			hash.localRoot.remove();
			hash.localRoot = null;
			hash = null;
		}, false);
	}

	onModuleDestruction( module ) {
		switch( module.name ) {
			case 'registerEmailDialog':
				this.addNodeEvent( 'a.followMe', 'click', this.followMeClick );
				break;
			case 'loginDialog':
				this.addNodeEvent( 'div.login', 'click', this.onLoginClick );
				break;
			case 'registerDialog':
				this.addNodeEvent( 'div.registerName', 'click', this.onRegisterName );
				break;
			case 'liveChatDialog':
				this.addNodeEvent( 'div.startLiveChat', 'click', this.startLiveChat );
				break;
		}
	}
}
/****************************************** TopSection End ******************************************/

/*****************************************************************************************************
 *  Entry point for this GUI Module.
 *****************************************************************************************************/
async function start( ...args ) {
	[ transforms, style, scrollUpStyle, quickNavStyle ].forEach( style => style.use() );

	let topSectionLoading		= await new topSection( ...args ),
		videoSectionLoading		= videoSection.start();

	return Promise.all([ topSectionLoading, videoSectionLoading ]);
}

export { start };
