'use strict';

import { Component } from 'barfoos2.0/core.js';
import { extend, Mix } from 'barfoos2.0/toolkit.js';
import { win } from 'barfoos2.0/domkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';
import Speech from 'barfoos2.0/speech.js';
import * as commentSection from 'commentSection/js/main.js';
import Clipboard from 'clipboard';

import html from '../markup/main.html';
import loadNextChunkMarkup from '../markup/loadNextChunk.html';
import style from '../style/main.scss';
import loadNextChunkStyle from '../style/loadNextChunk.scss';

/*****************************************************************************************************
 *  articlePreview Module renders previews based on article data. It also launches the
 *	articleViewer Module
 *****************************************************************************************************/
class ArticlePreview extends Mix( Component ).With( ServerConnection, Speech ) {
	constructor( input = { }, options = { } ) {
		if( input.articleData ) {
			input.articleData.aid					= input.articleData.subject ? input.articleData.subject.replace( /\s+/g, '-' ).replace( /[^\w.|-]/g, '') : input.articleData.internalId;
			input.articleData.articlePreviewImage	= input.articleData.fileNames[ 0 ];
			input.articleData.formatedDate			= new Date( input.articleData.creationDate ).toLocaleDateString();

			extend( options ).with({
				name:				'ArticlePreview',
				tmpl:				html,
				renderData:			extend( input.articleData ).with({ uri: ENV_PROD ? 'www.der-vegane-germane.de' : 'dev.der-vegane-germane.de' }).get(),
				touchStartPos:		Object.create( null ),
				session:			null
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
			this.addNodeEvent( 'div.articleThumbnail', 'mousedown', this.articleTitleMouseDown );
			this.addNodeEvent( 'div.articleThumbnail', 'mouseup', this.launchArticleViewer );
			this.addNodeEvent( 'div.articleThumbnail', 'click', this.preventClick );
			this.addNodeEvent( 'div.read', 'click', this.readArticle );
			this.addNodeEvent( 'a.articleThumbnailAnchor', 'click', this.preventClick );
			this.addNodeEvent( 'div.showMore', 'click', this.showMore );
			this.addNodeEvent( 'div.editArticleData', 'click', this.editMode );
			this.addNodeEvent( 'div.removeArticle', 'click', this.removeArticle );
			this.addNodeEvent( 'input.donateRange', 'input', this.onRangeSlide );
			this.addNodeEvent( 'input.donateAmount input.donateRange', 'focusin', this.onDonateAmountFocus );
			this.addNodeEvent( 'input.donateAmount input.donateRange', 'focusout', this.onDonateAmountBlur );
			this.addNodeEvent( 'input.donateNow', 'click', this.onDonateNowClick );
			this.on( 'openArticleViewer.appEvents', this.onOpenArticleViewer, this );
			this.on( 'startNewSession.server', this.checkAdminRights, this );
			this.on( 'userLogout.server', this.checkAdminRights, this );
			this.recv( 'articleWasRemoved', this.articleWasRemoved.bind( this ) );
			this.recv( 'articleWasUpdated', this.articleWasUpdated.bind( this ) );

			this.checkOverflow();

			this.clipboard = new Clipboard(this.nodes[ 'div.copyLinkToClipboard' ], {
				text: () => {
					this.copyLink = this.activateSpinner({
						at:		this.nodes[ 'div.copyLinkToClipboard' ],
						opts:	{
							lowblur:	true
						}
					});

					this.nodes[ 'div.copyLinkToClipboard' ].textContent = 'Kopiert!';

					this.copyLink.fulfill().then( () => {
						this.copyLink.cleanup();
						this.nodes[ 'div.copyLinkToClipboard' ].textContent = 'Link kopieren';
					});

					return `https://${ location.host }/static/${ this.articleData.subject.replace( /\s+/g, '-' ).replace( /[^\w.|-]/g, '') }/index.html`;
				}
			});

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

			if( this.highlightArticleId ) {
				this.nodes.root.classList.add( 'highlight' );
				this.showMore();
			}

			if( this.speechNotAvailable ) {
				this.nodes[ 'div.read' ].remove();
			}

			this.initComments();

			await this.fire( 'getUserSession.server', session => this.session = session );

			this.checkAdminRights( this.session );
		}


		return this;
	}

	async destroy() {
		this.clipboard && this.clipboard.destroy();
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

	checkOverflow() {
		if( this.nodes[ 'div.text' ].textContent.trim().length === 0 ) {
			this.nodes[ 'div.articleBodyPreview'].classList.remove( 'textMode' );

			if( this.articleData.articlePreviewImage ) {
				this.nodes[ 'div.articleThumbnail' ].classList.add( 'imageMode' );
			}
		}

		if( this.nodes[ 'div.text' ].scrollHeight > this.nodes[ 'div.text' ].offsetHeight ) {
			this.nodes[ 'div.showMore' ].style.display = 'flex';
			this.nodes[ 'div.text' ].classList.add( 'overflow' );
		} else {
			this.nodes[ 'div.text' ].classList.remove( 'overflow' );
			this.nodes[ 'div.showMore' ].style.display = 'none';
		}
	}

	onDonateClick() {
		this.nodes[ 'div.donate' ].style.display = 'none';
		this.nodes[ 'div.donationForm' ].style.display = 'flex';
	}

	onRangeSlide() {
		this.nodes[ 'input.donateAmount' ].value = this.nodes[ 'input.donateRange' ].value + '€';
	}

	onDonateAmountFocus() {
		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		'donation'
			}
		});
	}

	onDonateAmountBlur() {
		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		this.name
			},
			extra:		this.articleData.aid
		});
	}

	onDonateNowClick() {
		win.open( `https://www.paypal.com/myaccount/transfer/send/external/ppme?profile=DerVeganeGermane&currencyCode=EUR&amount=${ win.parseFloat( this.nodes[ 'input.donateAmount' ].value ) }&locale.x=de_DE&country.x=DE`, '_blank' );
	}

	checkAdminRights( session ) {
		if( session ) {
			if( session.__isAdmin ) {
				this.nodes[ 'div.adminPanel' ].style.display = session.__destroyed ? 'none' : 'flex';
			}
		}
	}

	editMode() {
		try {
			this.render({ htmlData: '<textarea class="editTitle" style="width:%width%px;height:%height%px;background-color:transparent;">%text%</textarea>', crlf: true }).with({
				text:		this.nodes[ 'div.articleTitle' ].innerHTML,
				width:		this.nodes[ 'div.articleTitle' ].offsetWidth || '100',
				height:		this.nodes[ 'div.articleTitle' ].offsetHeight || '10'
			}).at({
				node:		this.nodes[ 'div.articleTitle' ],
				position:	'replace'
			});

			this.render({ htmlData: '<textarea class="editText" style="width:%width%px;height:%height%px;background-color:transparent;">%text%</textarea>', crlf: true }).with({
				text:		this.nodes[ 'div.text' ].innerHTML,
				width:		this.nodes[ 'div.text' ].offsetWidth || '100',
				height:		this.nodes[ 'div.text' ].offsetHeight || '10'
			}).at({
				node:		this.nodes[ 'div.text' ],
				position:	'replace'
			});

			this.removeNodeEvent( 'div.editArticleData', 'click', this.editMode );
			this.addNodeEvent( 'div.editArticleData', 'click', this.editArticleData );
			this.nodes[ 'div.editArticleData' ].textContent = 'Senden';
		} catch( ex ) {
			this.log( ex );
		}
	}

	async editArticleData() {
		try {
			this.createModalOverlay({
				at:	this.nodes.root
			});

			let result = await this.send({
				type:		'editArticleData',
				payload:	{
					internalId:		this.articleData.internalId,
					subject:		this.nodes[ 'textarea.editTitle' ].value,
					body:			this.nodes[ 'textarea.editText' ].value
				}
			});

			this.nodes[ 'div.articleTitle' ].innerHTML	= result.data.article.subject.replace( /\n/g, '<br/>' );
			this.nodes[ 'div.text' ].innerHTML			= result.data.article.body.replace( /\n/g, '<br/>' );

			this.nodes[ 'textarea.editTitle' ].replaceWith( this.nodes[ 'div.articleTitle' ] );
			this.nodes[ 'textarea.editText' ].replaceWith( this.nodes[ 'div.text' ] );

			this.removeNodes([ 'textarea.editTitle', 'textarea.editText' ]);

			this.removeNodeEvent( 'div.editArticleData', 'click', this.editArticleData );
			this.addNodeEvent( 'div.editArticleData', 'click', this.editMode );

			this.nodes[ 'div.editArticleData' ].textContent = 'Bearbeiten';

			this.checkOverflow();
			this.modalOverlay.fulfill();
		} catch( ex ) {
			this.log( ex );
		}
	}

	async removeArticle() {
		try {
			await this.send({
				type:		'removeArticle',
				payload:	{
					articleId:		this.articleData._id
				}
			});
		} catch( ex ) {
			this.log( ex );
		}
	}

	async articleWasRemoved( id ) {
		if( this.articleData._id === id ) {
			this.destroy();
		}
	}

	async articleWasUpdated( article ) {
		if( this.articleData._id === article._id ) {
			let fade = await this.transition({
				node:	this.nodes.root,
				style:	{ opacity:	{ from: 1, to: '0.25' } },
				rules:	{
					duration:	400,
					timing:		'linear'
				}
			});

			this.nodes[ 'div.articleTitle' ].innerHTML = article.subject.replace( /\n/g, '<br/>' );
			this.nodes[ 'div.text' ].innerHTML = article.body.replace( /\n/g, '<br/>' );

			this.checkOverflow();

			fade.undo();
		}
	}

	readArticle() {
		let success = this.read( this.articleData.body );

		if( success ) {
			// to be done.
		}
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

		event.preventDefault();
		event.stopPropagation();
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
		this.fire( 'loadNextArticles.ArticleSection' );
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

	return await new ArticlePreview( ...args );
}

export { start };
