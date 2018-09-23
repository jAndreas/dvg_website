'use strict';

import { Component } from 'barfoos2.0/core.js';
import { extend, mix } from 'barfoos2.0/toolkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import loadNextChunkMarkup from '../markup/loadNextChunk.html';
import style from '../style/main.scss';
import loadNextChunkStyle from '../style/loadNextChunk.scss';

/*****************************************************************************************************
 *  videoPreview Module renders previews based on video data. It also launches the
 *	videoPlayer Module
 *****************************************************************************************************/
class videoPreview extends mix( Component ).with( ServerConnection ) {
	constructor( input = { }, options = { } ) {
		if( input.videoData ) {
			input.videoData.views	= input.videoData.views.toString().replace( /\B(?=(\d{3})+(?!\d))/g, ',' );
			input.videoData.vid		= input.videoData.videoTitle ? input.videoData.videoTitle.replace( /\s+/g, '-' ).replace( /[^\w.|-]/g, '') : input.videoData.internalId;

			extend( options ).with({
				name:			'videoPreview',
				tmpl:			html,
				renderData:		input.videoData,
				touchStartPos:	Object.create( null )
			}).and( input );
		} else if( input.mode === 'loadNextChunk' ) {
			extend( options ).with({
				name:			'videoPreview',
				tmpl:			loadNextChunkMarkup,
				renderData:		input.info
			}).and( input );
		}

		super( options );

	/*	this.runtimeDependencies.push(
			this.fire( 'SomeEvent.appEvents' ) // or any promise
		);*/

		return this.init();
	}

	async init() {
		await super.init();

		if( this.mode === 'loadNextChunk' ) {
			this.addNodeEvent( 'div.videoPreview', 'click', this.onLoadNextChunk );
			this.on( `updateNextInfo.${ this.name }`, this.onUpdateNextInfo, this );
			this.on( `destroyNextInfo.${ this.name }`, this.onDestroyNextInfo, this );
		} else {
			this.addNodeEvent( 'a.videoThumbnailAnchor, span.videoTitle', 'mousedown', this.videoTitleMouseDown );
			this.addNodeEvent( 'a.videoThumbnailAnchor, span.videoTitle', 'mouseup', this.launchVideoModule );
			this.addNodeEvent( 'a.videoThumbnailAnchor, span.videoTitle', 'click', this.preventClick );
			this.on( 'openVideoPlayer.appEvents', this.onOpenVideoPlayer, this );
			this.recv( 'videoViewCountUpdate', this.updateViewCount.bind( this ) );
		}

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style, loadNextChunkStyle ].forEach( s => s.unuse() );
	}

	async preventClick( event ) {
		event.preventDefault();
	}

	async videoTitleMouseDown( event ) {
		if( event.changedTouches && event.changedTouches.length ) {
			this.touchStartPos = event.changedTouches[ 0 ];
		} else {
			this.touchStartPos = { pageX: event.pageX, pageY: event.pageY };
		}
	}

	async launchVideoModule( at ) {
		let touchEndPos;

		if( at && typeof at.preventDefault === 'function' ) {
			at.preventDefault();
			at.stopPropagation();
		}

		if( at && at.changedTouches && at.changedTouches.length ) {
			touchEndPos = at.changedTouches[ 0 ];
		} else {
			touchEndPos	= at;
		}

		if( at === 0 || (Math.abs( this.touchStartPos.pageX - touchEndPos.pageX ) < 10 && Math.abs( this.touchStartPos.pageY - touchEndPos.pageY ) < 10) ) {
			let videoPlayer = await import( /* webpackChunkName: "videoPlayerDialog" */'videoPlayerDialog/js/main.js' );

			videoPlayer.start({
				location:	this.location,
				videoData:	this.videoData,
				at:			at
			});
		}
	}

	onOpenVideoPlayer({ internalId, at }) {
		if( this.videoData.internalId === internalId || this.videoData.videoTitle.replace( /\s+/g, '-' ).replace( /[^\w.|-]/g, '') === internalId ) {
			this.launchVideoModule( at );
			return internalId;
		}
	}

	onLoadNextChunk() {
		this.fire( 'loadNextVideos.videoSection' );
	}

	onUpdateNextInfo( info ) {
		this.nodes[ 'div.loadNext' ].innerHTML = `weiter... (${ info.videosLeft })<br/>→`;
	}

	onDestroyNextInfo() {
		this.destroy();
	}

	updateViewCount( data ) {
		if( data.videoId === this.videoData.id ) {
			this.videoData.views						= data.count;
			this.videoData.uniqueViews					= data.uniqueCount;
			this.nodes[ 'span.videoViews' ].textContent	= `${ data.count.toString().replace( /\B(?=(\d{3})+(?!\d))/g, ',' ) } Aufrufe`;
		}
	}

	onDialogModeChange() {
	}
}
/****************************************** videoPreview End ******************************************/

async function start( ...args ) {
	[ style, loadNextChunkStyle ].forEach( style => style.use() );

	return await new videoPreview( ...args );
}

export { start };
