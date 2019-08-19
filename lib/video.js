'use strict';
import { type, MakeClass, Composition } from 'barfoos2.0/toolkit.js';
import { win, doc } from 'barfoos2.0/domkit.js';
import Mediator from 'barfoos2.0/mediator.js';
import LogTools from 'barfoos2.0/logtools.js';

const	eventLoop		= MakeClass().Mixin( Mediator ),
		console			= MakeClass( class video{ }, { id: 'video' } ).Mixin( LogTools ),
		isHLSavailable	= !!doc.createElement( 'video' ).canPlayType( 'application/vnd.apple.mpegURL' );

let		hlsJSTransfer	= null,
		hlsJSstatic		= null;

class VideoTools extends Composition( LogTools, Mediator ) {
	constructor( videoElement ) {
		super( ...arguments );

		if( videoElement instanceof HTMLVideoElement ) {
			this.video		= videoElement;
			this.hasSource	= false;
			this.hlsJS		= null;
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

	async play( position ) {
		if( this.hasSource || position ) {
			if( hlsJSstatic && hlsJSstatic.isSupported() && this.hlsJS ) {
				if( position ) {
					this.hlsJS.startLoad( position );
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
					try {
						await this.video.play();
					} catch( ex )  {
						return -1;
					}
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
		if( hlsJSstatic && hlsJSstatic.isSupported() && this.hlsJS ) {
			this.hlsJS.stopLoad();
		} else {
			this.video.src	= '';
		}

		this.pause();
		this.hasSource	= false;

		return this;
	}

	seek( second = 0 ) {
		//if( hlsJSstatic && hlsJSstatic.isSupported() && this.hlsJS ) {
		//	this.hlsJS.startLoad( second );
		//} else {
			this.video.currentTime = second;
		//}
	}

	addControls() {
		this.video.setAttribute( 'controls', true );
	}

	addInline() {
		this.video.setAttribute( 'playsinline', true );
	}

	destroy() {
		this.stop();

		if( hlsJSstatic && hlsJSstatic.isSupported() && this.hlsJS ) {
			this.hlsJS.detachMedia();
		}

		this.video.src = '';
		this.video = null;
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

//if(!isHLSavailable && !( 'Hls' in win ) ) {
	hlsJSTransfer = import( /* webpackChunkName: "hls.js" */ 'hls.js/dist/hls.light.min.js' ).then( hlsJS => {
		hlsJSstatic = hlsJS.default;
		return 'hls.js transferred';
	});
//}

function loadVideo({ videoLink, videoElement, fallbackPath, silenced }) {
	return new Promise( ( res, rej ) => {
		if( type( videoLink ) !== 'String' || type( videoElement ) !== 'HTMLVideoElement') {
			rej( 'loadVideo called with wrong arguments.');
		}

		let timeout = win.setTimeout(() => {
			//rej( `Unable to load video "${ videoLink }".` );

			videoTools.src( fallbackPath );
			res( videoTools );
		}, 8000);

		videoElement.onerror = function( err ) {
			win.clearTimeout( timeout );
			rej( err );
		};

		videoElement.onloadeddata = function() {
			win.clearTimeout( timeout );
			console.log( videoElement, '-> onloadeddata fired.');
			//res( videoTools );
		};

		videoElement.oncanplay = function() {
			win.clearTimeout( timeout );
			console.log( videoElement, '-> oncanplay fired.');
			res( videoTools );
		};

		let videoTools = new VideoTools( videoElement );

		if( silenced ) {
			videoTools.silence();
		}

		//if( isHLSavailable ) {
		//	videoTools.src( videoLink );
		//	res( videoTools );
		if( hlsJSstatic && hlsJSstatic.isSupported() ) {
			videoTools.hlsJS		= new hlsJSstatic();
			videoTools.hlsEvents	= hlsJSstatic.Events;

			videoTools.hlsJS.loadSource( videoLink );
			videoTools.hlsJS.attachMedia( videoTools.node );
			videoTools.hlsJS.on( hlsJSstatic.Events.MANIFEST_PARSED, () => {
				if( silenced ) {
					videoTools.silence();
				}

				videoTools.HLSJS();
				//res( videoTools );
			});

			videoTools.hlsJS.on( hlsJSstatic.Events.LEVEL_SWITCHED, ( id, data ) => {
				eventLoop.fire( 'streamInputChanged.video', videoTools.hlsJS.levels[ data.level ].height );
			});

			videoTools.hlsJS.on( hlsJSstatic.Events.ERROR, ( event, data ) => {
				if( data.fatal ) {
					switch( data.type ) {
						case hlsJSstatic.ErrorTypes.NETWORK_ERROR:
							console.log( 'fatal network error encountered, trying to recover' );
							videoTools.hlsJS.startLoad();
							break;
						case hlsJSstatic.ErrorTypes.MEDIA_ERROR:
							console.log( 'fatal media error encountered, trying to recover' );
							videoTools.hlsJS.recoverMediaError();
							break;
						default:
							videoTools.hlsJS.destroy();
					}
				}
			});
		} else if( isHLSavailable ) {
			videoTools.src( videoLink );
			res( videoTools );
		} else if( type( fallbackPath ) === 'String' ) {
			videoTools.src( fallbackPath );
			res( videoTools );
		}
	});
}

eventLoop.on( 'waitforHLSSupport.appEvents', () => hlsJSTransfer );

export { loadVideo, VideoTools };
