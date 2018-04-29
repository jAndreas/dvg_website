'use strict';

/* fuck eslint, we need to load the core.js here */
import { main } from 'barfoos2.0/core.js';
import { Composition } from 'barfoos2.0/toolkit.js';
import { doc, win } from 'barfoos2.0/domkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';
import Mediator from 'barfoos2.0/mediator.js';
import LogTools from 'barfoos2.0/logtools.js';
import BrowserKit from 'barfoos2.0/browserkit.js';

const	Browser		= new BrowserKit(),
		bgImagePath	= '/images/background.jpg';

class DVGWebsite extends Composition( Mediator, LogTools, ServerConnection ) {
	constructor() {
		super( ...arguments );

		Object.assign(this, {
			currentHash:			Object.create( null ),
			localUser:				Object.create( null ),
			lastPostedHashString:	'',
			id:						'app'
		});

		this.init();
	}

	async init() {
		main();

		this.on( 'userLogin.server', this.onUserLogin, this );
		this.on( 'userLogout.server', this.onUserLogout, this );
		this.on( 'waitForBackgroundImageLoaded.appEvents', this.waitForBackgroundImageLoaded, this );
		this.on( 'setTitle.appEvents', this.setTitle, this );
		this.on( 'moduleLaunch.appEvents', this.onModuleLaunch, this );
		this.on( 'moduleDestruction.appEvents', this.onModuleDestruction, this );
		this.on( 'connect.server checkSession.appEvents', this.onReconnect, this );
		this.once( 'articleSection.launchModule', this.launchArticleSection, this );
		this.once( 'aboutMeSection.launchModule', this.launchAboutMeSection, this );
		this.once( 'supportSection.launchModule', this.launchSupportSection, this );
		this.once( 'impressumSection.launchModule', this.launchImpressumSection, this );
		this.once( 'mobileNavigationSection.launchModule', this.launchMobileNavigationSection, this );
		// dynamic routing is not enabled for now.
		this.on( 'hashChange.appEvents', this.navigateByHash, this );
		this.on( 'updateHash.appEvents', this.updateHash, this );

		this.recv( 'dispatchedChatMessage', this.onChatMessage.bind( this ) );
		this.recv( 'reloadPage', this.onRemotePageReload.bind( this ) );

		this.backgroundImage	= Browser.loadImage( bgImagePath );
		let objURL				= await this.backgroundImage;

		this.fire( 'configApp.core', {
			name:				'Der Vegane Germane - Website',
			title:				'Der Vegane Germane',
			version:			'0.1.0',
			status:				'beta',
			background:			{
				objURL:		objURL,
				css:	{
				}
			}
		});

		this.sessionLoginData	= localStorage.getItem( 'dvgLogin' );
		this.extraInfo			= new Map();

		await this.routeByHash( await this.fire( 'getHash.appEvents' ) );

		this.on( 'appFocusChange.appEvents appVisibilityChange.appEvents', this.appFocusChange, this );
	}

	appFocusChange( active ) {
		if( active ) {
			this.updateHash({
				data:	{
					action:	this.extraInfo.get( 'beforeBlur' ) || this.currentHash.get( 'action' ) || this.currentHash.get( 'ref' ) || '',
				},
				extra:	this.extraInfo.get( this.extraInfo.get( 'beforeBlur' ) )
			});
		} else {
			if( this.currentHash.get( 'action' ) !== 'blur' ) {
				this.extraInfo.set( 'beforeBlur', this.currentHash.get( 'action' ) || '' );
				this.updateHash({
					data:	{
						action: 'blur'
					}
				});
			}
		}

		return false;
	}

	onChatMessage( data ) {
		if( data.from !== this.localUser.__username && data.content.indexOf( `@${ this.localUser.__username }` ) > -1 ) {
			this.fire( 'notifyUserAboutMessage.chat', data );
		}
	}

	onRemotePageReload() {
		win.location.reload( true );
	}

	onUserLogin( user ) {
		Object.assign( this.localUser, user );
		localStorage.setItem( 'dvgLogin', JSON.stringify( user ) );
	}

	onUserLogout( user ) {
		localStorage.removeItem( 'dvgLogin' );
	}

	onReconnect() {
		this.sessionLoginData = localStorage.getItem( 'dvgLogin' );

		if( this.sessionLoginData ) {
			let user = JSON.parse( this.sessionLoginData );

			Object.assign( this.localUser, user );
			this.fire( 'sessionLogin.appEvents', user );
		}
	}

	waitForBackgroundImageLoaded() {
		return this.backgroundImage;
	}

	setTitle( title = '' ) {
		doc.title = title;
	}

	onModuleLaunch( module ) {
		switch( module.name ) {
			case 'videoPlayerDialog':
				this.currentHash.set( 'watch', module.state.videoData.internalId );
				doc.location.hash = this.currentHash.toString();
				break;
			case 'liveChatDialog':
				this.currentHash.set( 'chat', 1 );
				doc.location.hash = this.currentHash.toString();
				break;
		}
	}

	onModuleDestruction( module ) {
		switch( module.name ) {
			case 'videoPlayerDialog':
				this.currentHash.delete( 'watch' );
				this.currentHash.delete( 'action' );
				doc.location.hash = this.currentHash.toString();
				break;
			case 'liveChatDialog':
				this.currentHash.delete( 'chat' );
				doc.location.hash = this.currentHash.toString();
				break;
		}
	}

	async routeByHash( hash ) {
		this.currentHash = hash;

		if( hash.has( 'confirmSubscription' ) ) {
			let confirmSubDialog = await import( /* webpackChunkName: "confirmSubscriptionDialog" */ 'confirmSubscriptionDialog/js/main.js' );
			confirmSubDialog.start({
				secretKey:	hash.get( 'confirmSubscription' )
			});
		} else if( hash.has( 'confirmUser' ) ) {
			let confirmSubDialog = await import( /* webpackChunkName: "confirmSubscriptionDialog" */ 'confirmSubscriptionDialog/js/main.js' );
			confirmSubDialog.start({
				secretKey:		hash.get( 'confirmUser' ),
				confirmUser:	true
			});
		} else if( hash.has( 'confirmReset' ) ) {
			let confirmSubDialog = await import( /* webpackChunkName: "confirmSubscriptionDialog" */ 'confirmSubscriptionDialog/js/main.js' );
			confirmSubDialog.start({
				secretKey:		hash.get( 'confirmReset' ),
				confirmReset:	true
			});
		} else if( hash.has( 'uploadVideo' ) ) {
			let uploadVideoDialog = await import( /* webpackChunkName: "uploadVideoDialog" */ 'uploadVideoDialog/js/main.js' );
			uploadVideoDialog.start();
		} else if( hash.has( 'dispatchMail' ) ) {
			let dispatchMailDialog = await import( /* webpackChunkName: "dispatchMailDialog" */ 'dispatchMailDialog/js/main.js' );
			dispatchMailDialog.start();
		} else {
			// contains also videoSection
			let topSection = await import( /* webpackChunkName: "topSection" */ 'topSection/js/main.js' );
			await topSection.start({
				skipInitialVideo:	hash.has( 'watch' )
			});

			if( hash.has( 'watch' ) ) {
				this.fire( 'openVideoPlayer.appEvents', {
					internalId:	hash.get( 'watch'),
					at:			hash.get( 'at' ) || 0
				});
			}

			if( hash.has( 'ref' ) ) {
				// scroll section into view
			}

			if( hash.has( 'chat' ) ) {
				this.fire( 'openLiveChat.appEvents' );
			}
		}
	}

	async changeUserAction( action ) {
		if( this.lastPostedHashString !== this.currentHash.toString() ) {
			this.lastPostedHashString = this.currentHash.toString();

			this.send({
				type:		'userAction',
				payload:	{
					id:			action,
					extra:		this.extraInfo.get( this.currentHash.get( 'action' ) ) || ''
				}
			}, {
				simplex:	true
			});
		}
	}

	async navigateByHash( hash ) {
		this.currentHash = hash;

		if( hash.has( 'action' ) || hash.has( 'ref' ) ) {
			this.changeUserAction( hash.get( 'action' ) || hash.get( 'ref' ) || '' );
		}
	}

	async updateHash( hashUpdate = { data: { }, extra: null } ) {
		for( let [ key, value ] of Object.entries( hashUpdate.data ) ) {
			this.currentHash.set( key, value );

			if( hashUpdate.extra ) {
				this.extraInfo.set( value, hashUpdate.extra );
			}
		}

		location.hash = '';
		location.hash = this.currentHash.toString();
	}

	async launchArticleSection() {
		let state = await this.fire( 'findModule.articleSection' );

		if( state !== true ) {
			let articleSection = await import( /* webpackChunkName: "articleSection" */ 'articleSection/js/main.js' );
			await articleSection.start();
		} else {
			this.log( 'aboutMeSection already online, aborting launch.' );
		}
	}

	async launchAboutMeSection() {
		await this.launchArticleSection();

		let state = await this.fire( 'findModule.aboutMeSection' );

		if( state !== true ) {
			let aboutMeSection = await import( /* webpackChunkName: "aboutMeSection" */ 'aboutMeSection/js/main.js' );
			await aboutMeSection.start();
		} else {
			this.log( 'aboutMeSection already online, aborting launch.' );
		}
	}

	async launchSupportSection() {
		await this.launchAboutMeSection();

		let supportSection = await import( /* webpackChunkName: "supportSection" */ 'supportSection/js/main.js' );
		await supportSection.start();
	}

	async launchImpressumSection() {
		let impressumSection = await import( /* webpackChunkName: "impressumSection" */ 'impressumSection/js/main.js' );
		await impressumSection.start();
	}

	async launchMobileNavigationSection() {
		let mobileNavigationSection = await import( /* webpackChunkName: "mobileNavigationSection" */ 'mobileNavigationSection/js/main.js' );
		await mobileNavigationSection.start();
	}
}

new DVGWebsite();
