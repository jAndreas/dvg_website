'use strict';

import { Component } from 'barfoos2.0/core.js';
import { extend, isAgentCrawler, isLocalChrome } from 'barfoos2.0/toolkit.js';
import { moduleLocations } from 'barfoos2.0/defs.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  articleSection is the host of articles
 *****************************************************************************************************/
class ArticleSection extends Component {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			location:			moduleLocations.center,
			loadingMessage:		'Warte auf Serververbindung...',
			tmpl:				html,
			previewLinks:		[ ],
			highlightArticleId:	null
		}).and( input );

		super( options );

		/*this.runtimeDependencies.push(
			this.fire( 'waitForConnection.server' )
		);*/

		return this.init();
	}

	async init() {
		if( isLocalChrome || isAgentCrawler ) {
			super.init();
		} else {
			await super.init();
		}

		let retVal;

		try {
			retVal = await this.loadArticleData( false, this.highlightArticleId );
		} catch( ex ) {
			this.modalOverlay && this.modalOverlay.log( ex || 'Fehler', 0 );

			this.tryReconnectServer();
			await this.fire( 'waitForConnection.server' );

			retVal = await this.loadArticleData( false, this.highlightArticleId );
		}

		this.on( 'loadNextArticles.ArticleSection', this.loadNextArticles, this );

		this.recv( 'articleWasRemoved', this.articleWasRemoved.bind( this ) );
		this.recv( 'newArticleWasCreated', this.newArticleWasCreated.bind( this ) );

		this.modalOverlay && await this.modalOverlay.fulfill();

		return retVal;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
	}

	async inViewport() {
		super.inViewport && super.inViewport( ...arguments );

		this.fire( 'AboutMeSection.launchModule' );
		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		this.id,
				ref:		this.id
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

	async loadNextArticles() {
		return await this.loadArticleData( true );
	}

	articleWasRemoved( id ) {
		let index = this.previewLinks.findIndex( instance => instance.articleData._id === id );

		if( index > -1 ) {
			this.log( 'Removing preview link entry for: ', id );
			this.previewLinks.splice( index, 1 );
		}
	}

	async newArticleWasCreated( articleData ) {
		let articlePreviewPromise = await import( /* webpackChunkName: "articlePreview" */ 'articlePreview/js/main.js'  );

		let articlePreviewInstance = await articlePreviewPromise.start({
			location:		this.id,
			nodeLocation:	'afterbegin',
			articleData:	articleData
		});

		this.previewLinks.push( articlePreviewInstance );
	}

	async loadArticleData( next = false, highlightArticleId = null ) {
		return new Promise(async ( res, rej ) => {
			try {
				let response;

				response = await this.send({
					type:		next ? 'getNextArticles' : 'getPublishedArticles',
					payload:	{
						start:					this.previewLinks.length,
						highlightArticleId:		highlightArticleId
					}
				});

				for( let article of response.data.articleData ) {
					let articlePreviewPromise = await import( /* webpackChunkName: "articlePreview" */ 'articlePreview/js/main.js'  );

					let articlePreviewInstance = await articlePreviewPromise.start({
						location:				this.id,
						articleData:			article,
						highlightArticleId:		article.internalId === highlightArticleId || article.subject.replace( /\s+/g, '-' ).replace( /[^\w.|-]/g, '') === highlightArticleId
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
				this.fire( 'updateNextInfo.ArticlePreview', {
					articlesLeft:	totalLength - this.previewLinks.length
				});
			} else {
				let articlePreviewPromise = await import( /* webpackChunkName: "articlePreview" */ 'articlePreview/js/main.js'  );

				this.nextModule = await articlePreviewPromise.start({
					location:	this.id,
					mode:		'loadNextChunk',
					info:		{
						articlesLeft:	totalLength - this.previewLinks.length
					}
				});
			}

			return true;
		} else {
			this.fire( 'destroyNextInfo.ArticlePreview' );
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

	return await new ArticleSection( ...args );
}

export { start };
