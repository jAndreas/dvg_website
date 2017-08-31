'use strict';

import { Mediator } from 'barfoos2.0/mediator.js';
import { type, makeClass } from 'barfoos2.0/toolkit.js';
import { win, doc, LogTools } from 'barfoos2.0/domkit.js';

const	eventLoop		= makeClass().mixin( Mediator ),
		console			= makeClass( class video{ }, { id: 'video' } ).mixin( LogTools ),
		isHLSavailable	= !!doc.createElement( 'video' ).canPlayType( 'application/vnd.apple.mpegURL' );

var		hlsJSTransfer	= null,
		hlsJSinst		= null,
		hlsJSstatic		= null;

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

		if( isHLSavailable ) {
			videoElement.src = videoLink;
		} else if( hlsJSinst ) {
			hlsJSinst.loadSource( videoLink );
			hlsJSinst.attachMedia( videoElement );
			hlsJSinst.on( hlsJSstatic.Events.MANIFEST_PARSED, () => {
				videoElement.muted = true;
				res( videoElement );
			});
		} else if( type( fallbackPath ) === 'String' ) {
			videoElement.src = fallbackPath;
			res( videoElement );
		}

		videoElement.onerror = function( err ) {
			rej( err );
		};

		videoElement.onloadeddata = function() {
			console.log( videoElement, '-> onloadeddata fired.');
			res( videoElement );
		};

		videoElement.oncanplay = function() {
			videoElement.muted = true;
			console.log( videoElement, '-> oncanplay fired.');
			res( videoElement );
		};
	});
}

eventLoop.on( 'waitforHLSSupport.appEvents', () => hlsJSTransfer );

export { loadVideo };
