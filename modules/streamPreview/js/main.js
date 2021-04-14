'use strict';

import { Component } from 'barfoos2.0/core.js';
import { extend, Mix } from 'barfoos2.0/toolkit.js';
import { win } from 'barfoos2.0/domkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  StreamPreview Module renders previews based on stream data. It also launches the
 *	videoPlayer Module
 *****************************************************************************************************/
class StreamPreview extends Mix( Component ).With( ServerConnection ) {
	constructor( input = { }, options = { } ) {
		if( input.streamData ) {
			extend( options ).with({
				name:			'StreamPreview',
				tmpl:			html,
				renderData:		input.streamData,
				touchStartPos:	Object.create( null )
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

		this.addNodeEvent( 'a.streamThumbnailAnchor, span.streamTitle', 'mousedown', this.streamTitleMouseDown );
		this.addNodeEvent( 'a.streamThumbnailAnchor, span.streamTitle', 'mouseup', this.launchVideoModule );
		this.addNodeEvent( 'a.streamThumbnailAnchor, span.streamTitle', 'click', this.preventClick );

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
	}

	async updateData( stream ) {
		this.nodes[ 'div.streamThumbnail' ].style.backgroundImage = `url(${ stream.thumbnailUrl })`;
		this.nodes[ 'span.streamTitle' ].textContent = `${ stream.title }`;
		this.nodes[ 'span.viewerCount' ].textContent = `${ stream.viewer_count } Zuschauer`;
		this.nodes[ 'span.streamDuration' ].textContent = `seit ${ stream.hTime }`;
	}

	async preventClick( event ) {
		event.preventDefault();
	}

	async streamTitleMouseDown( event ) {
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
			//let videoPlayer = await import( /* webpackChunkName: "videoPlayerDialog" */'videoPlayerDialog/js/main.js' );

			//videoPlayer.start({
			//	location:	this.location,
			//	videoData:	this.streamData,
			//	at:			at
			//});
			win.open( 'https://www.twitch.tv/meinungsverbrechen', '_blank' );
		}
	}

	onDestroyNextInfo() {
		this.destroy();
	}

	onDialogModeChange() {
	}
}
/****************************************** StreamPreview End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	return await new StreamPreview( ...args );
}

export { start };
