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
	constructor( input = { }, options = { } ) {
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

			this.log('response.data.videoData: ', response.data.videoData);
			response.data.videoData.sort((a,b) => {
				return b.creationDate - a.creationDate;
			});

			for( let video of response.data.videoData ) {
				video.hTime = this.getTimePeriod( video.creationDate );

				this.render({ htmlData: videoPreviewMarkup, standalone: true }).with( video ).at({
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

	getTimePeriod( timestamp ) {
		let diff 			= Date.now() - timestamp,
			diffSeconds		= Math.round( diff / 1000 ),
			diffMinutes		= Math.round( diffSeconds / 60 ),
			diffHours		= Math.round( diffMinutes / 60 ),
			diffDays		= Math.round( diffHours / 24 ),
			diffWeeks		= Math.round( diffDays / 7 ),
			diffMonths		= (diffWeeks / 4).toFixed( 1 ),
			diffYears		= (diffMonths / 12).toFixed( 1 );

		if( diffYears >= 1 ) {
			return diffYears + ' Jahr' + (diffYears > 1 ? 'e' : '');
		} else if( diffMonths >= 1 ) {
			return diffMonths + ' Monat' + (diffMonths > 1 ? 'e' : '');
		} else if( diffWeeks >= 1 ) {
			return diffWeeks + ' Woche' + (diffWeeks > 1 ? 'n' : '');
		} else if( diffDays >= 1 ) {
			return diffDays + ' Tag' + (diffDays > 1 ? 'e' : '');
		} else if( diffHours >= 1 ) {
			return diffHours + ' Stunde' + (diffHours > 1 ? 'n' : '');
		} else if( diffMinutes >= 1) {
			return diffMinutes + ' Minute' + (diffMinutes > 1 ? 'n' : '');
		} else {
			return diffSeconds + ' Sekunde' + (diffSeconds > 1 ? 'n' : '');
		}
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
