'use strict';

import { Component } from 'barfoos2.0/core.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend } from 'barfoos2.0/toolkit.js';

import html from '../markup/main.html';
import style from '../style/main.scss';


let		instance		= null;

/*****************************************************************************************************
 *  "description here"
 *****************************************************************************************************/
class videoPreview extends Component {
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

		this.addNodeEvent( 'div.videoThumbnail, span.videoTitle', 'click, touchstart', this.launchVideoModule );

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

	onDialogModeChange( active ) {
	}
}
/****************************************** videoPreview End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	instance = await new videoPreview( ...args );
}

function stop() {
	[ style ].forEach( style => style.unuse() );

	if( instance ) {
		instance.destroy();
	}
}

export { start, stop };
