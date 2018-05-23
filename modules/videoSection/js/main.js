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
			name:			'videoSection',
			location:		moduleLocations.center,
			loadingMessage:	'Warte auf Serververbindung...',
			tmpl:			html,
			previewLinks:	[ ]
		}).and( input );

		super( options );

		this.runtimeDependencies.push(
			this.fire( 'waitForConnection.server' )
		);

		return this.init();
	}

	async init() {
		this.on( 'slideDownArrayClicked.topSection', this.slideIntoView, this );

		await super.init();

		this.on( 'moduleLaunch.appEvents', this.onVideoPlayerLaunch, this );
		this.on( 'moduleDestruction.appEvents', this.onVideoPlayerDestruction, this );
		this.on( 'loadNextVideos.videoSection', this.onLoadNextVideos, this );

		let retVal;

		try {
			retVal = this.loadVideoData();

			//await retVal;
		} catch( ex ) {
			this.modalOverlay && this.modalOverlay.log( ex || 'Fehler', 0 );

			this.tryReconnectServer();
			await this.fire( 'waitForConnection.server' );

			retVal = this.loadVideoData();
		}

		//this.on( 'connect.server', this.onConnect.bind( this ) );
		//this.on( 'disconnect.server', this.onDisconnect.bind( this ) );

		this.modalOverlay && await this.modalOverlay.fulfill();

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
				action:		this.name,
				ref:		this.name
			}
		});
	}

	async offViewport() {
		super.offViewport && super.offViewport( ...arguments );
	}

	/*async onConnect() {
		this._disconnected = false;

		if( this.modalOverlay ) {
			await this.modalOverlay.fulfill();
		}

		this.loadVideoData();
	}

	async onDisconnect() {
		let link;

		this._disconnected = true;
		this.createModalOverlay({
			opts:	{
				spinner:	true
			}
		});

		this.modalOverlay.log( 'Warte auf Serververbindung...', 0 );

		while( (link = this.previewLinks.shift()) ) {
			await link.destroy();
			link = null;
		}
	}*/

	async loadVideoData( next = false ) {
		return new Promise(async ( res, rej ) => {
			try {
				let response;

				response = await this.send({
					type:		next ? 'getNextVideos' : 'getPublishedVideos',
					payload:	{
						start:	this.previewLinks.length
					}
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

				let nextChunkAvailable = this.checkNext( response.data.total );

				res( nextChunkAvailable );
			} catch( ex ) {
				rej( ex );
			}
		});
	}

	async checkNext( totalLength = 0 ) {
		if( this.previewLinks.length < totalLength ) {
			if( this.nextModule ) {
				this.fire( 'updateNextInfo.videoPreview', {
					videosLeft:	totalLength - this.previewLinks.length
				});
			} else {
				let videoPreviewPromise = await import( /* webpackChunkName: "videoPreview" */ 'videoPreview/js/main.js'  );

				this.nextModule = await videoPreviewPromise.start({
					location:	this.id,
					mode:		'loadNextChunk',
					info:		{
						videosLeft:	totalLength - this.previewLinks.length
					}
				});
			}

			return true;
		} else {
			this.fire( 'destroyNextInfo.videoPreview' );
			return false;
		}
	}

	async onLoadNextVideos() {
		return await this.loadVideoData( true );
	}

	async onVideoPlayerLaunch( module ) {
		if( module.name === 'videoPlayerDialog' ) {
			await this.createModalOverlay({
				at:		this.nodes.root,
				opts:	{
					inheritBackground:	true
				}
			});
		}
	}

	onVideoPlayerDestruction( module ) {
		if( module.name === 'videoPlayerDialog' ) {
			if(!this._disconnected ) {
				this.modalOverlay && this.modalOverlay.cleanup();
			}
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
