'use strict';

import { Component } from 'barfoos2.0/core.js';
import { extend, mix, getTimePeriod } from 'barfoos2.0/toolkit.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  videoSection module receives all published video data and launches the videoPreview module based
 *	on that data. It will supervise the videoPreview modules.
 *****************************************************************************************************/
class videoSection extends mix( Component ).with( ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			location:		moduleLocations.center,
			tmpl:			html,
			previewLinks:	[ ]
		}).and( input );

		super( options );

		/*this.runtimeDependencies.push(
			this.fire( 'SomeEvent.appEvents' ) // or any promise
		);*/

		return this.init();
	}

	async init() {
		await super.init();

		await this.createModalOverlay({
			opts:	{
				spinner: true
			}
		});

		this.on( 'slideDownArrayClicked.topSection', this.slideIntoView, this );
		this.on( 'moduleLaunch.appEvents', this.onVideoPlayerLaunch, this );
		this.on( 'moduleDestruction.appEvents', this.onVideoPlayerDestruction, this );

		let retVal;

		try {
			retVal = this.loadVideoData();

			await retVal;
		} catch( ex ) {
			await this.createModalOverlay({
				opts:	{
					spinner:	true
				}
			});

			this.modalOverlay.log( ex || 'Fehler', 0 );

			await this.fire( 'waitForConnection.server' );

			retVal = this.loadVideoData();
		}

		this.on( 'connect.server', this.onConnect.bind( this ) );
		this.on( 'disconnect.server', this.onDisconnect.bind( this ) );

		await this.modalOverlay.fulfill();

		return retVal;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
	}

	async inViewport() {
		super.inViewport && super.inViewport( ...arguments );

		this.fire( 'articleSection.launchModule' );
		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		this.id,
				ref:		this.id
			}
		});
	}

	async offViewport() {
		super.offViewport && super.offViewport( ...arguments );
	}

	async onConnect() {
		if( this.modalOverlay ) {
			await this.modalOverlay.fulfill();
		}

		this.loadVideoData();
	}

	async onDisconnect() {
		let link;

		this.createModalOverlay({
			opts:	{
				spinner:	true
			}
		});

		this.modalOverlay.log( 'Server connection lost.', 0 );

		while( link = this.previewLinks.shift() ) {
			await link.destroy();
			link = null;
		}
	}

	async loadVideoData() {
		return new Promise(async ( res, rej ) => {
			try {
				let response;

				response = await this.send({
					type:		'getPublishedVideos'
				});

				response.data.videoData.sort(( a, b ) => {
					return b.creationDate - a.creationDate;
				});

				for( let video of response.data.videoData ) {
					video.hTime = getTimePeriod( video.creationDate );

					let videoPreviewPromise = await import( /* webpackChunkName: "videoPreview" */ 'videoPreview/js/main.js'  );

					let videoPreviewInstance = await videoPreviewPromise.start({
						location:	this.id,
						videoData:	video
					});

					this.previewLinks.push( videoPreviewInstance );
				}

				res();
			} catch( ex ) {
				rej( ex );
			}
		});
	}

	async onVideoPlayerLaunch( module ) {
		if( module.id === 'videoPlayerDialog' ) {
			await this.createModalOverlay({
				at:		this.nodes.root,
				opts:	{
					inheritBackground:	true
				}
			});
		}
	}

	onVideoPlayerDestruction( module ) {
		if( module.id === 'videoPlayerDialog' ) {
			this.modalOverlay && this.modalOverlay.cleanup();
		}
	}

	slideIntoView() {
		this.fire( 'slideDownTo.appEvents', this.nodes.root );
	}
}
/****************************************** videoSection End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	return await new videoSection( ...args );
}

export { start };
