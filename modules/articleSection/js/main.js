'use strict';

import { Component } from 'barfoos2.0/core.js';
import { extend, mix, getTimePeriod } from 'barfoos2.0/toolkit.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  articleSection is the host of articles
 *****************************************************************************************************/
class articleSection extends mix( Component ).with( ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:				'articleSection',
			location:			moduleLocations.center,
			loadingMessage:		'Warte auf Serververbindung...',
			tmpl:				html,
			previewLinks:		[ ]
		}).and( input );

		super( options );

		this.runtimeDependencies.push(
			this.fire( 'waitForConnection.server' )
		);

		return this.init();
	}

	async init() {
		await super.init();

		let retVal;

		try {
			retVal = this.loadArticleData();
		} catch( ex ) {
			this.modalOverlay && this.modalOverlay.log( ex || 'Fehler', 0 );

			this.tryReconnectServer();
			await this.fire( 'waitForConnection.server' );

			retVal = this.loadArticleData();
		}

		this.modalOverlay && await this.modalOverlay.fulfill();

		return retVal;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
	}

	async inViewport() {
		super.inViewport && super.inViewport( ...arguments );

		this.fire( 'aboutMeSection.launchModule' );
		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		this.name,
				ref:		this.name
			}
		});
	}

	async offViewport() {
		this.fire( 'updateHash.appEvents', {
			data:	{
				read:		''
			}
		});

		super.offViewport && super.offViewport( ...arguments );
	}

	async loadArticleData( next = false ) {
		return new Promise(async ( res, rej ) => {
			try {
				let response;

				response = await this.send({
					type:		next ? 'getNextArticles' : 'getPublishedArticles',
					payload:	{
						start:	this.previewLinks.length
					}
				});

				for( let article of response.data.articleData ) {
					let articlePreviewPromise = await import( /* webpackChunkName: "articlePreview" */ 'articlePreview/js/main.js'  );

					let articlePreviewInstance = await articlePreviewPromise.start({
						location:		this.name,
						articleData:	article
					});

					this.previewLinks.push( articlePreviewInstance );
				}

				let nextChunkAvailable = this.checkNext( response.data.total );

				res( nextChunkAvailable );
			} catch( ex ) {
				rej( ex );
			}
		});
	}

	async checkNext( totalLength = 0 ) {
		if( this.previewLinks.length < totalLength ) {
			if( this.nextModule ) {
				this.fire( 'updateNextInfo.articlePreview', {
					articlesLeft:	totalLength - this.previewLinks.length
				});
			} else {
				let articlePreviewPromise = await import( /* webpackChunkName: "articlePreview" */ 'articlePreview/js/main.js'  );

				this.nextModule = await articlePreviewPromise.start({
					location:	this.name,
					mode:		'loadNextChunk',
					info:		{
						articlesLeft:	totalLength - this.previewLinks.length
					}
				});
			}

			return true;
		} else {
			this.fire( 'destroyNextInfo.articlePreview' );
			return false;
		}
	}

	async onLoadNextVideos() {
		return await this.loadVideoData( true );
	}
}
/****************************************** articleSection End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	return await new articleSection( ...args );
}

export { start };
