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
		this.once( 'aboutMe.launchModule', this.launchAboutMe, this );
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

	async routeByHash( hash ) {
		if( hash.has( 'confirmSubscription' ) ) {
			let confirmSubDialog = await import( /* webpackChunkName: "confirmSubscriptionDialog" */ 'confirmSubscriptionDialog/js/main.js' );
			confirmSubDialog.start({
				secretKey:	hash.get( 'confirmSubscription' )
			});
		} else if( hash.has( 'uploadVideo' ) ) {
			let uploadVideo = await import( /* webpackChunkName: "uploadVideoDialog" */ 'uploadVideoDialog/js/main.js' );
			uploadVideo.start();
		} else {
			let topSectionLoadingPromise		= import( /* webpackChunkName: "topSection" */ 'topSection/js/main.js' ),
				videoSectionLoadingPromise		= import( /* webpackChunkName: "videoSection" */ 'videoSection/js/main.js' );

			let topSection = await topSectionLoadingPromise;
			topSection.start();

			let videoSection = await videoSectionLoadingPromise;
			await videoSection.start();

			if( hash.has( 'watch' ) ) {
				this.fire( 'openVideoPlayer.appEvents', hash.get( 'watch') );
			}
		}
	}

	async launchAboutMe() {
		let aboutMeSection = await import( /* webpackChunkName: "aboutMeSection" */ 'aboutMeSection/js/main.js' );
		await aboutMeSection.start();
	}
}

new DVGWebsite();
