'use strict';

import { Component } from 'barfoos2.0/core.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend, Mix } from 'barfoos2.0/toolkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import giftOverlayMarkup from '../markup/giftOverlay.html';
import style from '../style/main.scss';
import giftOverlayStyle from '../style/giftOverlay.scss';

import merchAudio from '../audio/merchbuy.mp3';

/*****************************************************************************************************
*
*****************************************************************************************************/
class WishListOverlay extends Mix( Component ).With( ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:			'WishListOverlay',
			tmpl:			html,
			location:		moduleLocations.center,
			audio:			new Audio( merchAudio )
		}).and( input );

		super( options );

		this.runtimeDependencies.push(
			this.fire( 'waitForConnection.server' )
		);

		return this.init();
	}

	async init() {
		await super.init();

		this.recv( 'newAmazonGifts', this.newAmazonGifts.bind( this ) );

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style, giftOverlayStyle ].forEach( s => s.unuse() );
	}

	async newAmazonGifts( list ) {
		ENV_PROD && console.log( 'new wishes: ', list );
		if( Array.isArray( list ) ) {
			for( let wishData of list ) {
				//console.log( 'wishData:', wishData );
				await this.showGiftOverlay( wishData );
				await this.timeout( 2000 );
			}
		}
	}

	async showGiftOverlay( data ) {
		return new Promise(async ( res, rej ) => {
			this.audio.currentTime = 0;

			try {
				await this.audio.play();
			} catch( ex ) {
				ENV_PROD && console.log( 'error: ', ex );
			}

			let hash = this.render({ htmlData: giftOverlayMarkup, standalone: true }).with( data ).at({
				node:		this.nodes.root,
				position:	'afterbegin'
			});

			//await this.timeout( 15000 );
			this.audio.addEventListener( 'ended', async () => {
				try {
					await this.transition({
						node:	hash.localRoot,
						style:	{ opacity:	{ from: 1, to: '0' } },
						rules:	{
							duration:	400,
							timing:		'ease-out'
						}
					});
				} catch( ex ) {
					ENV_PROD && console.log( 'error: ', ex );
				}

				hash.localRoot.remove();
				res();
			});
		});
	}
}
/****************************************** WishListOverlay End ******************************************/

async function start( ...args ) {
	[ style, giftOverlayStyle ].forEach( style => style.use() );

	return await new WishListOverlay( ...args );
}

export { start };
