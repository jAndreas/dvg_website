'use strict';
import { type, makeClass, Composition } from 'barfoos2.0/toolkit.js';
import { win, doc } from 'barfoos2.0/domkit.js';
import Mediator from 'barfoos2.0/mediator.js';
import LogTools from 'barfoos2.0/logtools.js';

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
			this.video		= videoElement;
			this.hasSource	= false;
		} else {
			this.error( `videoElement must be of type HTMLVideoElement, received instead: ${ videoElement }` );
		}
	}

	fadeVolumeIn({ duration:duration = 100 } = { }) {
		let step	= (this.video.volume || 1) / duration,
			v		= this.video,
			vol		= v.volume;

		v.muted = false;

		return new Promise(( res ) => {
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

		return new Promise(( res ) => {
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
		this.hasSource	= true;
		this.video.src	= s;
		this.lastSource	= s;
		return this;
	}

	HLSJS() {
		this.hasSource	= true;
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

	play( position ) {
		if( this.hasSource || position ) {
			if( hlsJSstatic && hlsJSstatic.isSupported() ) {
				if( position ) {
					hlsJSinst.startLoad( position );
				}

				this.video.play();
			} else {
				if( position ) {
					this.src( this.lastSource );

					this.video.oncanplay = () => {
						if( position ) {
							this.seek( position );
						}

						this.video.play();
						this.video.oncanplay = () => {};
					};
				} else {
					this.video.play();
				}
			}

			this.hasSource = true;
		}

		return this;
	}

	pause() {
		this.video.pause();
		return this;
	}

	stop() {
		if( hlsJSstatic && hlsJSstatic.isSupported() ) {
			hlsJSinst.stopLoad();
		} else {
			this.video.src	= '';
		}

		this.pause();
		this.hasSource	= false;

		return this;
	}

	seek( second = 0 ) {
		this.video.currentTime = second;
	}

	get node() {
		return this.video;
	}

	get paused() {
		return this.video.paused;
	}

	get stopped() {
		return !this.hasSource;
	}

	get getTime() {
		return this.video.currentTime;
	}
}

if(!isHLSavailable && !( 'Hls' in win ) ) {
	hlsJSTransfer = import( /* webpackChunkName: "hls.js" */ 'hls.js/dist/hls.min.js' ).then( hlsJS => {
		hlsJSstatic = hlsJS.default;

		if( hlsJSstatic.isSupported() ) {
			hlsJSinst = new hlsJS.default();
		}

		return 'hls.js transferred';
	});
}

function reInitHLSJS() {
	if( hlsJSstatic && hlsJSstatic.isSupported() ) {
		hlsJSinst = new hlsJSstatic();
	}
}

function loadVideo( videoLink, videoElement, fallbackPath ) {
	return new Promise( ( res, rej ) => {
		if( type( videoLink ) !== 'String' || type( videoElement ) !== 'HTMLVideoElement') {
			rej( 'loadVideo called with wrong arguments.');
		}

		let timeout = win.setTimeout(() => {
			rej( 'Unable to load background video.' );
		}, 2000);

		videoElement.onerror = function( err ) {
			win.clearTimeout( timeout );
			rej( err );
		};

		videoElement.onloadeddata = function() {
			win.clearTimeout( timeout );
			console.log( videoElement, '-> onloadeddata fired.');
			res( videoTools );
		};

		videoElement.oncanplay = function() {
			win.clearTimeout( timeout );
			console.log( videoElement, '-> oncanplay fired.');
			res( videoTools );
		};

		let videoTools = new VideoTools( videoElement );

		videoTools.silence();

		if( isHLSavailable ) {
			videoTools.src( videoLink );
		} else if( hlsJSinst ) {
			hlsJSinst.loadSource( videoLink );
			hlsJSinst.attachMedia( videoTools.node );
			hlsJSinst.on( hlsJSstatic.Events.MANIFEST_PARSED, () => {
				videoTools.silence();
				videoTools.HLSJS();
				res( videoTools );
			});
		} else if( type( fallbackPath ) === 'String' ) {
			videoTools.src( fallbackPath );
			res( videoTools );
		}
	});
}

eventLoop.on( 'waitforHLSSupport.appEvents', () => hlsJSTransfer );

export { loadVideo, reInitHLSJS, VideoTools };
