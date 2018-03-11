'use strict';

import { Overlay, GlasEffect, Draggable } from 'barfoos2.0/dialog.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend, mix } from 'barfoos2.0/toolkit.js';
import { win } from 'barfoos2.0/domkit.js';
import { loadVideo } from 'video.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

let		instance		= null;

/*****************************************************************************************************
 *  "description here"
 *****************************************************************************************************/
class videoPlayerDialog extends mix( Overlay ).with( GlasEffect, Draggable, ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			tmpl:				html,
			renderData:			extend( input.videoData ).with({ uri: ENV_PROD ? 'www.der-vegane-germane.de' : 'dev.der-vegane-germane.de' }).get(),
			centerToViewport:	true,
			topMost:			true
		}).and( input );

		super( options );

		this.runtimeDependencies.push(
			this.fire( 'waitforHLSSupport.appEvents' )
		);

		return this.init();
	}

	async init() {
		await super.init();

		this._boundMediaChange = this.mediaChanged.bind( this );

		this.setupMediaQueryWatchers();
		this.initVideo();
		this.addNodeEvent( 'div.expand', 'click touchstart', this.showFullDescription );
		this.addNodeEvent( 'div.donate', 'click touchstart', this.onDonateClick );
		this.addNodeEvent( 'input.donateRange', 'input', this.onRangeSlide );
		this.addNodeEvent( 'input.donateNow', 'click touchstart', this.onDonateNowClick );

		this.log('videoData: ', this.videoData);

		return this;
	}

	async destroy() {
		this.video && this.video.destroy();
		this.video = null;

		this.destroyMediaQueryWatchers();
		this.modalOverlay && this.modalOverlay.cleanup();

		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
	}

	/////////////////////////////////////////////////////////////////////////////////////////////////////////
	setupMediaQueryWatchers() {
		extend( this ).with({
			res360:			win.matchMedia( '(min-width:415px) and (min-height:370px)' ),
			res480:			win.matchMedia( '(min-width:736px) and (min-height:490px)' ),
			res480wide:		win.matchMedia( '(min-width:870px)' ),
			res720:			win.matchMedia( '(min-width:1300px) and (min-height:900px)' )
		});

		[ this.res360, this.res480, this.res480wide, this.res720 ].forEach( res => {
			res.addListener( this._boundMediaChange );
		});
	}

	destroyMediaQueryWatchers() {
		[ this.res360, this.res480, this.res480wide, this.res720 ].forEach( res => {
			res.removeListener( this._boundMediaChange );
		});
	}

	mediaChanged() {
		this.scrollContainerIntoView();
		win.setTimeout( this.centerOverlay.bind( this ), 100 );
	}

	async initVideo() {
		try {
			this.video = await	loadVideo({
				videoLink:		`/_video/${ this.videoData.internalId }/complete_,108,72,48,36,0.mp4.urlset/master.m3u8`,
				videoElement:	this.nodes[ 'video.mainPlayer' ],
				fallbackPath:	`/fallback/_video/${ this.videoData.internalId }/intro_480.mp4`
			});
		} catch( ex ) {
			this.modalOverlay = this.createModalOverlay({
				at:		this.nodes[ 'div.playerWrapper' ]
			});

			await this.modalOverlay.log( ex || 'Fehler', 125000 );
			await this.modalOverlay.fulfill();
			this.modalOverlay = null;
		}
	}

	showFullDescription() {
		this.removeNodes( 'div.expand', true );
		this.nodes[ 'span.description' ].classList.remove( 'folded' );
		//this.nodes[ 'span.description' ].scrollIntoView();
	}

	onDonateClick() {
		this.nodes[ 'div.donate' ].style.display = 'none';
		this.nodes[ 'div.donationForm' ].style.display = 'flex';
	}

	onRangeSlide() {
		this.nodes[ 'input.donateAmount' ].value = this.nodes[ 'input.donateRange' ].value + '€';
	}

	onDonateNowClick() {
		win.open( `https://www.paypal.me/DerVeganeGermane/send?amount=${ win.parseFloat( this.nodes[ 'input.donateAmount' ].value ) }&currencyCode=EUR`, '_blank' );
	}
}
/****************************************** videoPlayerDialog End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	instance = await new videoPlayerDialog( ...args );
}

function stop() {
	[ style ].forEach( style => style.unuse() );

	if( instance ) {
		instance.destroy();
	}
}

export { start, stop };
