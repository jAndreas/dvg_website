'use strict';

import { Component } from 'barfoos2.0/core.js';
import { extend, mix } from 'barfoos2.0/toolkit.js';
import { win } from 'barfoos2.0/domkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';
import * as commentSection from 'commentSection/js/main.js';

import html from '../markup/main.html';
import loadNextChunkMarkup from '../markup/loadNextChunk.html';
import style from '../style/main.scss';
import loadNextChunkStyle from '../style/loadNextChunk.scss';

/*****************************************************************************************************
 *  articlePreview Module renders previews based on article data. It also launches the
 *	articleViewer Module
 *****************************************************************************************************/
class articlePreview extends mix( Component ).with( ServerConnection ) {
	constructor( input = { }, options = { } ) {
		if( input.articleData ) {
			input.articleData.aid					= input.articleData.subject ? input.articleData.subject.replace( /\s+/g, '-' ).replace( /[^\w.|-]/g, '') : input.articleData.internalId;
			input.articleData.articlePreviewImage	= input.articleData.fileNames[ 0 ];
			input.articleData.formatedDate			= new Date( input.articleData.creationDate ).toLocaleDateString();

			extend( options ).with({
				name:				'articlePreview',
				tmpl:				html,
				renderData:			input.articleData,
				touchStartPos:		Object.create( null )
			}).and( input );
		} else if( input.mode === 'loadNextChunk' ) {
			extend( options ).with({
				name:				'articlePreview',
				tmpl:				loadNextChunkMarkup,
				renderData:			input.info
			}).and( input );
		}

		super( options );

	/*	this.runtimeDependencies.push(
			this.fire( 'SomeEvent.appEvents' ) // or any promise
		);*/

		return this.init();
	}

	async init() {
		await super.init();

		if( this.mode === 'loadNextChunk' ) {
			this.addNodeEvent( 'div.articlePreview', 'click', this.onLoadNextChunk );
			this.on( `updateNextInfo.${ this.name }`, this.onUpdateNextInfo, this );
			this.on( `destroyNextInfo.${ this.name }`, this.onDestroyNextInfo, this );
		} else {
			this.addNodeEvent( 'div.articleThumbnail, div.articleTitle', 'mousedown', this.articleTitleMouseDown );
			this.addNodeEvent( 'div.articleThumbnail, div.articleTitle', 'mouseup', this.launchArticleViewer );
			this.addNodeEvent( 'div.articleThumbnail, div.articleTitle', 'click', this.preventClick );
			this.addNodeEvent( 'a.articleThumbnailAnchor', 'click', this.preventClick );
			this.addNodeEvent( 'div.showMore', 'click', this.showMore );
			this.on( 'openArticleViewer.appEvents', this.onOpenArticleViewer, this );
		}

		if( this.nodes[ 'div.text' ].scrollHeight > this.nodes[ 'div.text' ].offsetHeight ) {
			this.nodes[ 'div.showMore' ].style.display = 'flex';
			this.nodes[ 'div.text' ].classList.add( 'overflow' );
		}


		if( this.articleData.articlePreviewImage ) {
			if( Array.isArray( this.articleData.fileNames ) && this.articleData.fileNames.length > 1 ) {
				for( let image of this.articleData.fileNames.reverse().slice( 0 ) ) {
					this.render({ htmlData:	'<div class="additionalImageMini" style="background-image:url(/articleFiles/%internalId%/%srcMini%)" onclick="onMiniImageClick" data-imageurl="/articleFiles/%internalId%/%src%"></div>', standalone: true }).with({
						src:		image,
						srcMini:	image.substr( 0, image.lastIndexOf('.') ) + '_mini' + image.substr( image.lastIndexOf('.') ),
						internalId:	this.articleData.internalId
					}).at({
						node:		'div.articleThumbnail',
						position:	'afterbegin'
					});
				}
			}
		} else {
			//this.nodes[ 'div.articleBodyPreview' ].style.height = `${ this.nodes[ 'div.articleBodyPreview' ].offsetHeight + this.nodes[ 'div.articleThumbnail' ].offsetHeight }px`;
			this.nodes[ 'div.articleThumbnail' ].style.display = 'none';
		}

		this.initComments();

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style, loadNextChunkStyle ].forEach( s => s.unuse() );
	}

	async initComments() {
		await commentSection.start({
			location:		this.name,
			context:		this.articleData._id,
			internalId:		this.articleData.internalId,
			speakingName:	this.articleData.subject,
			small:			true
		});
	}

	showMore() {
		this.nodes[ 'div.showMore' ].style.display = 'none';
		this.nodes[ 'div.text' ].classList.remove( 'overflow' );
		this.nodes[ 'div.articleBodyPreview' ].style.height = 'auto';
	}

	preventClick( event ) {
		event.preventDefault();
	}

 	articleTitleMouseDown( event ) {
		if( event.changedTouches && event.changedTouches.length ) {
			this.touchStartPos = event.changedTouches[ 0 ];
		} else {
			this.touchStartPos = { pageX: event.pageX, pageY: event.pageY };
		}
	}

	async openImageViewer( event ) {
		let imageViewerDialog = await import( /* webpackChunkName: "imageViewerDialog" */ 'imageViewerDialog/js/main.js' );
		await imageViewerDialog.start({
			location:	this.location,
			url:		this.nodes[ 'div.articleThumbnail' ].style.backgroundImage
		});

		at.preventDefault();
		at.stopPropagation();
	}

	async launchArticleViewer( at ) {
		let touchEndPos;

		if( at && typeof at.preventDefault === 'function' ) {
			at.preventDefault();
			at.stopPropagation();
		}

		if( at && at.originalTarget && at.originalTarget.classList.contains( 'additionalImageMini' ) ) {
			if( at.type === 'touchend' ) {
				this.onMiniImageClick({ target: at.originalTarget });
				return;
			} else {
				return;
			}
		}

		if( at && at.changedTouches && at.changedTouches.length ) {
			touchEndPos = at.changedTouches[ 0 ];
		} else {
			touchEndPos	= at;
		}

		if( at === 0 || (Math.abs( this.touchStartPos.pageX - touchEndPos.pageX ) < 10 && Math.abs( this.touchStartPos.pageY - touchEndPos.pageY ) < 10) ) {
			let imageViewerDialog = await import( /* webpackChunkName: "imageViewerDialog" */ 'imageViewerDialog/js/main.js' );
			await imageViewerDialog.start({
				location:	this.location,
				url:		this.nodes[ 'div.articleThumbnail' ].style.backgroundImage
			});
		}
	}

	onOpenArticleViewer({ internalId, at }) {
		if( this.articleData.internalId === internalId || this.articleData.subject.replace( /\s+/g, '-' ).replace( /[^\w.|-]/g, '') === internalId ) {
			this.launchArticleViewer( at );
			return internalId;
		}
	}

	onLoadNextChunk() {
		this.fire( 'loadNextVideos.articleSection' );
	}

	onUpdateNextInfo( info ) {
		this.nodes[ 'div.loadNext' ].innerHTML = `weiter... (${ info.articlesLeft })<br/>→`;
	}

	onDestroyNextInfo() {
		this.destroy();
	}

	onMiniImageClick( event ) {
		this.nodes[ 'div.articleThumbnail' ].style.backgroundImage = `url( ${ event.target.dataset.imageurl })`;
	}

	onDialogModeChange() {
	}
}
/****************************************** articlePreview End ******************************************/

async function start( ...args ) {
	[ style, loadNextChunkStyle ].forEach( style => style.use() );

	return await new articlePreview( ...args );
}

export { start };
