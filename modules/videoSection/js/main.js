'use strict';

import { Component } from 'barfoos2.0/core.js';
import Swipe from 'barfoos2.0/swipe.js';
import { extend, mix } from 'barfoos2.0/toolkit.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import videoPreviewMarkup from '../markup/videoPreview.html';
import style from '../style/main.scss';
import videoPreviewStyle from '../style/videoPreview.scss';

let		instance		= null;

/*****************************************************************************************************
 *  "description here"
 *****************************************************************************************************/
class videoSection extends mix( Component ).with( ServerConnection, Swipe ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			location:		moduleLocations.center,
			tmpl:			html
		}).and( input );

		super( options );

		/*this.runtimeDependencies.push(
			this.fire( 'SomeEvent.appEvents' ) // or any promise
		);*/

		return this.init();
	}

	async init() {
		await super.init();

		this.on( 'slideDown.topSection', this.onSlideDown, this );

		try {
			let response = await this.send({
				type:	'getPublishedVideos'
			});

			for( let video of response.data.videoData ) {
				this.render( videoPreviewMarkup ).with( video ).at({
					node:		'div.videoContainer',
					position:	'beforeend'
				});
			}
		} catch( ex ) {
			this.log( ex );
		}

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style, videoPreviewStyle ].forEach( s => s.unuse() );
	}

	onSwipeUp() {
		this.fire( 'slideUp.videoSection' );
	}

	onSlideDown() {
		this.fire( 'slideDown.appEvents', this.nodes.root );
	}
}
/****************************************** videoSection End ******************************************/

async function start( ...args ) {
	[ style, videoPreviewStyle ].forEach( style => style.use() );

	instance = await new videoSection( ...args );
}

function stop() {
	[ style ].forEach( style => style.unuse() );

	if( instance ) {
		instance.destroy();
	}
}

export { start, stop };
