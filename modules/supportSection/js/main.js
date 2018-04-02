'use strict';

import { Component } from 'barfoos2.0/core.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend } from 'barfoos2.0/toolkit.js';
import { win } from 'barfoos2.0/domkit.js';
import { loadVideo } from 'video.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  supportSection shows basic options how to support the dvg project
 *****************************************************************************************************/
class supportSection extends Component {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:			'supportSection',
			location:		moduleLocations.center,
			tmpl:			html
		}).and( input );

		super( options );

		extend( this ).with({
			videoLink:				'/_video/support_,108,72,48,36,0.mp4.urlset/master.m3u8',
			fallbackPath:			'/fallback/_video/support_480.mp4'
		});

		this.runtimeDependencies.push(
			this.fire( 'waitforHLSSupport.appEvents' )
		);

		return this.init();
	}

	async init() {
		await super.init();

		this._boundCheckTime	= this.checkVideoTime.bind( this );
		this._boundPlayHandler	= this.play.bind( this );

		this.addNodeEvent( 'div.impressum', 'click', this.onImpressumClick );

		this.createModalOverlay({
			opts:	{
				spinner: true
			}
		});

		try {
			this.video = await loadVideo({
				videoLink:		this.videoLink,
				videoElement:	this.nodes[ 'video.supportMeSequence' ],
				fallbackPath:	this.fallbackPath
			});

			this.modalOverlay.fulfill();
		} catch( ex ) {
			this.modalOverlay.log( ex );
		}

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
	}

	async onImpressumClick() {
		await this.fire( 'impressumSection.launchModule' );
		this.fire( 'slideDownTo.impressumSection' );
	}

	async inViewport({ enteredFrom }) {
		let result;

		if( this.video && enteredFrom === 'top' ) {
			this.video.seek( this.mobileVideo ? 3 : 0 );
			result = await this.video.play();

			if( result === -1 ) {
				this.video.node.classList.add( 'mobile' );
				this.video.addControls();
				this.mobileVideo = true;

				this.video.node.addEventListener( 'play', this._boundPlayHandler );
			}

			this.video.node.addEventListener( 'timeupdate', this._boundCheckTime );
		}

		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		this.name,
				ref:		this.name
			}
		});

		super.inViewport && super.inViewport( ...arguments );
	}

	async offViewport() {
		this.video && this.video.pause();

		this.nodes[ 'div.amazon' ].classList.remove( 'highlight' );
		this.nodes[ 'div.paypal' ].classList.remove( 'highlight' );

		this.video && this.video.node.removeEventListener( 'timeupdate', this._boundCheckTime );
		this.video && this.video.node.removeEventListener( 'play', this._boundPlayHandler );

		super.offViewport && super.offViewport( ...arguments );
	}

	play() {
		win.setTimeout(() => {
			this.video.node.webkitExitFullscreen();
			this.video.addInline();
		}, 1000);
	}

	checkVideoTime() {
		switch( Math.round( this.video.getTime ) ) {
			case 78: {
				this.nodes[ 'div.paypal' ].classList.add( 'highlight' );
				break;
			}
			case 80: {
				this.nodes[ 'div.paypal' ].classList.remove( 'highlight' );
				break;
			}
			case 82: {
				this.nodes[ 'div.amazon' ].classList.add( 'highlight' );
				break;
			}
			case 84: {
				this.nodes[ 'div.amazon' ].classList.remove( 'highlight' );
				break;
			}
		}
	}
}
/****************************************** supportSection End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	return await new supportSection( ...args );
}

export { start };
