'use strict';

import { mediator } from 'barfoos2.0/mediator.js';
import { extend, type } from 'barfoos2.0/toolkit.js';
import { win, doc } from 'barfoos2.0/domkit.js';

const	appEvents		= new mediator({ register: 'ApplicationEvents' }),
		isHLSavailable	= !!doc.createElement( 'video' ).canPlayType( 'application/vnd.apple.mpegURL' );

var		hlsJSTransfer	= null,
		hlsJSinst		= null,
		hlsJSstatic		= null;

if(!isHLSavailable && !( 'Hls' in win ) ) {
	console.log('No native HLS support, loading hls.js ...');

	hlsJSTransfer = import( /* webpackChunkName: "hls.js" */'hls.js/dist/hls.min.js' ).then( hlsJS => {
		console.log('hls.js loaded.');

		hlsJSstatic = hlsJS;

		if( hlsJSstatic.isSupported() ) {
			console.log('HLS can be emulated using html5 media stream on this machine.');
			hlsJSinst = new hlsJS();
		} else {
			console.log('No HLS support at all, playing normal html5 video.');
			video.src = fallbackPath;
		}
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
				//video.play();
				console.log('manifest parsed');
				res();
			});
		} else if( type( fallbackPath ) === 'String' ) {
			videoElement.src = fallbackPath;
			res();
		}

		videoElement.onerror = function( err ) {
			console.log( videoElement, ' -> error: ', err );
			rej( err );
		};

		videoElement.onloadeddata = function() {
			console.log( videoElement, '-> onloadeddata fired.');
			res();
		};

		videoElement.oncanplay = function() {
			console.log( videoElement, '-> oncanplay fired.');
			res();
		};
	});
}

export { hlsJSTransfer, loadVideo };
