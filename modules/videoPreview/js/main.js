'use strict';

import { Component } from 'barfoos2.0/core.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend, mix } from 'barfoos2.0/toolkit.js';
import { win } from 'barfoos2.0/domkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  videoPreview Module renders previews based on video data. It also launches the
 *	videoPlayer Module
 *****************************************************************************************************/
class videoPreview extends mix( Component ).with( ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			tmpl:			html,
			renderData:		input.videoData
		}).and( input );

		super( options );

	/*	this.runtimeDependencies.push(
			this.fire( 'SomeEvent.appEvents' ) // or any promise
		);*/

		return this.init();
	}

	async init() {
		await super.init();

		this.addNodeEvent( 'div.videoThumbnail, span.videoTitle', win.innerWidth <= 768 ? 'touchstart' : 'click', this.launchVideoModule );
		this.on( 'openVideoPlayer.appEvents', this.onOpenVideoPlayer, this );
		this.recv( 'videoViewCountUpdate', this.updateViewCount.bind( this ) );

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
	}

	async launchVideoModule() {
		let videoPlayer = await import( /* webpackChunkName: "videoPlayerDialog" */'videoPlayerDialog/js/main.js' );

		videoPlayer.start({
			location:	this.location,
			videoData:	this.videoData
		});
	}

	onOpenVideoPlayer( internalId ) {
		if( this.videoData.internalId === internalId ) {
			this.launchVideoModule();
		}
	}

	updateViewCount( data ) {
		if( data.videoId === this.videoData.id ) {
			this.videoData.views						= data.count;
			this.videoData.uniqueViews					= data.uniqueCount;
			this.nodes[ 'span.videoViews' ].textContent	= `${ data.count } Aufrufe`;
		}
	}

	onDialogModeChange( active ) {
	}
}
/****************************************** videoPreview End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	return await new videoPreview( ...args );
}

export { start };
