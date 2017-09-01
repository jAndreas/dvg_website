'use strict';

import { Mediator } from 'barfoos2.0/mediator.js';
import { type, makeClass, Composition } from 'barfoos2.0/toolkit.js';
import { win, doc, LogTools } from 'barfoos2.0/domkit.js';

const	eventLoop		= makeClass().mixin( Mediator ),
		console			= makeClass( class video{ }, { id: 'video' } ).mixin( LogTools ),
		isHLSavailable	= !!doc.createElement( 'video' ).canPlayType( 'application/vnd.apple.mpegURL' );

let		hlsJSTransfer	= null,
		hlsJSinst		= null,
		hlsJSstatic		= null;

class VideoTools extends Composition( LogTools, Mediator ) {
	constructor( videoElement ) {
		super( ...arguments );

		if( videoElement instanceof HTMLVideoElement ) {
			this.video = videoElement;
		} else {
			this.error( `videoElement must be of type HTMLVideoElement, received instead: ${ videoElement }` );
		}
	}

	fadeVolumeIn({ duration:duration = 100 } = { }) {
		let step	= (this.video.volume || 1) / duration,
			v		= this.video,
			vol		= v.volume;

		v.muted = false;

		return new Promise(( res, rej ) => {
			(function fadeLoop() {
				if( vol < 1 ) {
					vol = vol + step > 1 ? 1 : vol + step;
					v.volume = vol;
					win.setTimeout( fadeLoop, step );
				} else {
					res( v.volume );
				}
			}());
		});
	}

	fadeVolumeOut({ duration:duration = 100 } = { }) {
		let step	= this.video.volume / duration,
			v		= this.video,
			vol		= v.volume;

		return new Promise(( res, rej ) => {
			(function fadeLoop() {
				if( vol > 0 ) {
					vol = vol - step < 0 ? 0 : vol - step;
					v.volume = vol;
					win.setTimeout( fadeLoop, step );
				} else {
					v.muted = true;
					res( v.volume );
				}
			}());
		});
	}

	src( s ) {
		this.video.src = s;
		return this;
	}

	mute() {
		this.video.muted = true;
		return this;
	}

	unmute() {
		this.video.muted = false;
		return this;
	}

	silence() {
		this.video.volume = 0;
		return this;
	}

	play() {
		this.video.play();
		return this;
	}

	pause() {
		this.video.pause();
		return this;
	}

	stop() {
		this.video.stop();
		return this;
	}

	get node() {
		return this.video;
	}

	get paused() {
		return this.video.paused;
	}
}

if(!isHLSavailable && !( 'Hls' in win ) ) {
	hlsJSTransfer = import( /* webpackChunkName: "hls.js" */ 'hls.js/dist/hls.min.js' ).then( hlsJS => {
		hlsJSstatic = hlsJS;

		if( hlsJSstatic.isSupported() ) {
			hlsJSinst = new hlsJS();
		}

		return 'hls.js transferred';
	});
}

function loadVideo( videoLink, videoElement, fallbackPath ) {
	return new Promise( ( res, rej ) => {
		if( type( videoLink ) !== 'String' || type( videoElement ) !== 'HTMLVideoElement') {
			rej( 'loadVideo called with wrong arguments.');
		}

		let videoTools = new VideoTools( videoElement );

		if( isHLSavailable ) {
			videoTools.src( videoLink );
		} else if( hlsJSinst ) {
			hlsJSinst.loadSource( videoLink );
			hlsJSinst.attachMedia( videoTools.node );
			hlsJSinst.on( hlsJSstatic.Events.MANIFEST_PARSED, () => {
				videoTools.silence();
				res( videoTools.node );
			});
		} else if( type( fallbackPath ) === 'String' ) {
			videoTools.src( fallbackPath );
			res( videoTools.node );
		}

		videoElement.onerror = function( err ) {
			rej( err );
		};

		videoElement.onloadeddata = function() {
			console.log( videoElement, '-> onloadeddata fired.');
			res( videoTools.node );
		};

		videoElement.oncanplay = function() {
			videoTools.silence();
			console.log( videoElement, '-> oncanplay fired.');
			res( videoTools.node );
		};
	});
}

eventLoop.on( 'waitforHLSSupport.appEvents', () => hlsJSTransfer );

export { loadVideo, VideoTools };
