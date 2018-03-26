'use strict';

import { Component } from 'barfoos2.0/core.js';
import { Composition } from 'barfoos2.0/toolkit.js';
import { doc } from 'barfoos2.0/domkit.js';
import Mediator from 'barfoos2.0/mediator.js';
import LogTools from 'barfoos2.0/logtools.js';
import BrowserKit from 'barfoos2.0/browserkit.js';

const	Browser		= new BrowserKit(),
		bgImagePath	= '/images/background.jpg';

class DVGWebsite extends Composition( Mediator, LogTools ) {
	constructor() {
		super( ...arguments );
		this.init();
	}

	async init() {
		this.on( 'waitForBackgroundImageLoaded.appEvents', this.waitForBackgroundImageLoaded, this );
		this.on( 'setTitle.appEvents', this.setTitle, this );
		this.on( 'moduleLaunch.appEvents', this.onModuleLaunch, this );
		this.on( 'moduleDestruction.appEvents', this.onModuleDestruction, this );
		this.once( 'aboutMeSection.launchModule', this.launchAboutMeSection, this );
		this.once( 'supportSection.launchModule', this.launchSupportSection, this );
		this.once( 'impressumSection.launchModule', this.launchImpressumSection, this );
		this.once( 'mobileNavigationSection.launchModule', this.launchMobileNavigationSection, this );
		// dynamic routing is not enabled for now.
		//this.on( 'hashChange.appEvents', this.routeByHash, this );

		this.backgroundImage	= Browser.loadImage( bgImagePath );
		let objURL				= await this.backgroundImage;

		this.fire( 'configApp.core', {
			name:				'Der Vegane Germane - Website',
			title:				'Der Vegane Germane',
			version:			'0.0.9',
			status:				'alpha',
			background:			{
				objURL:		objURL,
				css:	{
				}
			}
		});

		this.routeByHash( await this.fire( 'getHash.appEvents' ) );
	}

	waitForBackgroundImageLoaded() {
		return this.backgroundImage;
	}

	setTitle( title = '' ) {
		doc.title = title;
	}

	onModuleLaunch( module ) {
		switch( module.id ) {
			case 'videoPlayerDialog':
				doc.location.hash = `watch=${ module.state.videoData.internalId }`;
				break;
		}
	}

	onModuleDestruction( module ) {
		switch( module.id ) {
			case 'videoPlayerDialog':
				doc.location.hash = '';
				break;
		}
	}

	async routeByHash( hash ) {
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
		} else if( hash.has( 'uploadVideo' ) ) {
			let uploadVideoDialog = await import( /* webpackChunkName: "uploadVideoDialog" */ 'uploadVideoDialog/js/main.js' );
			uploadVideoDialog.start();
		} else if( hash.has( 'dispatchMail' ) ) {
			let dispatchMailDialog = await import( /* webpackChunkName: "dispatchMailDialog" */ 'dispatchMailDialog/js/main.js' );
			dispatchMailDialog.start();
		} else {
			// contains also videoSection
			let topSectionLoadingPromise		= import( /* webpackChunkName: "topSection" */ 'topSection/js/main.js' );

			let topSection = await topSectionLoadingPromise;
			await topSection.start();

			if( hash.has( 'watch' ) ) {
				this.fire( 'openVideoPlayer.appEvents', hash.get( 'watch') );
			}
		}
	}

	async launchAboutMeSection() {
		let state = await this.fire( 'getModuleState.core', 'aboutMeSection' );

		if( state === undefined ) {
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
