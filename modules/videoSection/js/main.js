'use strict';

import { Component } from 'barfoos2.0/core.js';
import { extend, Mix, getTimePeriod } from 'barfoos2.0/toolkit.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  videoSection module receives all published video data and launches the videoPreview module based
 *	on that data. It will supervise the videoPreview modules.
 *****************************************************************************************************/
class VideoSection extends Mix( Component ).With( ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:					'VideoSection',
			location:				moduleLocations.center,
			loadingMessage:			'Warte auf Serververbindung...',
			tmpl:					html,
			previewLinks:			[ ],
			streamId:				null,
			streamPreviewInstance:	null
		}).and( input );

		super( options );

		/*this.runtimeDependencies.push(
			this.fire( 'waitForConnection.server' )
		);*/

		return this.init();
	}

	async init() {
		this.on( 'slideDownArrayClicked.topSection', this.slideIntoView, this );

		await super.init();

		this.on( 'moduleLaunch.appEvents', this.onVideoPlayerLaunch, this );
		this.on( 'moduleDestruction.appEvents', this.onVideoPlayerDestruction, this );
		this.on( 'loadNextVideos.VideoSection', this.onLoadNextVideos, this );

		this.recv( 'twitchStatusUpdate', this.twitchStatusUpdate.bind( this ) );

		this.addNodeEvent( 'input.SearchText', 'change', this.loadFilterResults );
		this.addNodeEvent( 'i.removeFilter', 'click', this.removeSearchFilter );

		this.createModalOverlay({
			opts:	{
				spinner:	true
			}
		});

		this.modalOverlay && this.modalOverlay.log( 'Warte auf Serververbindung...', 0 );

		let retVal;

		try {
			retVal = await this.loadVideoData();
			this.modalOverlay && await this.modalOverlay.fulfill();
		} catch( ex ) {
			this.modalOverlay && this.modalOverlay.log( ex || 'Fehler', 0 );

			this.tryReconnectServer();
			await this.fire( 'waitForConnection.server' );

			retVal = await this.loadVideoData();
			this.modalOverlay && await this.modalOverlay.fulfill();
		}

		//this.on( 'connect.server', this.onConnect.bind( this ) );
		//this.on( 'disconnect.server', this.onDisconnect.bind( this ) );

		return retVal;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
	}

	async inViewport() {
		super.inViewport && super.inViewport( ...arguments );

		this.fire( 'ArticleSection.launchModule' );
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

				if( response.data.streamData ) {
					this.twitchStatusUpdate( response.data.streamData );
				}

				for( let video of response.data.videoData ) {
					video.hTime = getTimePeriod( video.creationDate );

					let videoPreviewPromise = await import( /* webpackChunkName: "videoPreview" */ 'videoPreview/js/main.js'  );

					let videoPreviewInstance = await videoPreviewPromise.start({
						location:	this.name,
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

	async loadFilterResults() {
		try {
			this.previewLinks.forEach( lnk => lnk.destroy() );
			this.previewLinks = [ ];

			if( this.nextModule ) {
				this.nextModule.destroy();
				this.nextModule = null;
			}

			let response = await this.send({
				type:		'loadFilterResults',
				payload:	{
					fullText:	this.nodes[ 'input.SearchText' ].value.slice( 0, 64 )
				}
			});

			for( let video of response.data.videoData ) {
				video.hTime = getTimePeriod( video.creationDate );

				let videoPreviewPromise = await import( /* webpackChunkName: "videoPreview" */ 'videoPreview/js/main.js'  );

				let videoPreviewInstance = await videoPreviewPromise.start({
					location:	this.name,
					videoData:	video
				});

				this.previewLinks.push( videoPreviewInstance );
			}

			this.nodes[ 'i.removeFilter' ].style.display = this.nodes[ 'input.SearchText' ].value.length ? 'flex' : 'none';
		} catch( ex ) {
			this.log( ex.message );
		}
	}

	async removeSearchFilter() {
		this.previewLinks.forEach( lnk => lnk.destroy() );
		this.previewLinks = [ ];

		this.nodes[ 'i.removeFilter' ].style.display = 'none';
		this.nodes[ 'input.SearchText' ].value = '';

		await this.loadVideoData();
	}

	async checkNext( totalLength = 0 ) {
		if( this.previewLinks.length < totalLength ) {
			if( this.nextModule ) {
				this.fire( 'updateNextInfo.VideoPreview', {
					videosLeft:	totalLength - this.previewLinks.length
				});
			} else {
				let videoPreviewPromise = await import( /* webpackChunkName: "videoPreview" */ 'videoPreview/js/main.js'  );

				this.nextModule = await videoPreviewPromise.start({
					location:	this.name,
					mode:		'loadNextChunk',
					info:		{
						videosLeft:	totalLength - this.previewLinks.length
					}
				});
			}

			return true;
		} else {
			this.fire( 'destroyNextInfo.VideoPreview' );
			return false;
		}
	}

	async twitchStatusUpdate( stream ) {
		this.log( 'twitchStatusUpdate: ', stream );

		if( stream ) {
			stream.hTime		= getTimePeriod( +new Date( stream.created_at ) );
			stream.thumbnailUrl	= stream.thumbnail;

			if( stream.is_live ) {
				// new stream / different stream
				this.streamId		= stream.live_title;
				this.streamPreviewInstance && this.streamPreviewInstance.destroy();
				
				let streamPreviewPromise = await import( /* webpackChunkName: "streamPreview" */ 'streamPreview/js/main.js'  );

				this.streamPreviewInstance = await streamPreviewPromise.start({
					location:		this.name,
					nodeLocation:	'afterbegin',
					streamData:		stream
				});
			} else {
				// updated stream data
				this.streamPreviewInstance && this.streamPreviewInstance.updateData( stream );
			}
		} else {
			// no more active stream
			this.streamPreviewInstance && this.streamPreviewInstance.destroy();
			delete this.streamPreviewInstance;
			delete this.streamId;
		}
	}

	async onLoadNextVideos() {
		return await this.loadVideoData( true );
	}

	async onVideoPlayerLaunch( module ) {
		if( module.name === 'VideoPlayerDialog' ) {
			await this.createModalOverlay({
				at:		this.nodes.root,
				opts:	{
					inheritBackground:	true
				}
			});
		}
	}

	onVideoPlayerDestruction( module ) {
		if( module.name === 'VideoPlayerDialog' ) {
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

	return await new VideoSection( ...args );
}

export { start };
