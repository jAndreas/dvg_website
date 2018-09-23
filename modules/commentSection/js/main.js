'use strict';

import { Component } from 'barfoos2.0/core.js';
import { mix, getTimePeriod } from 'barfoos2.0/toolkit.js';
import { extend } from 'barfoos2.0/toolkit.js';
import { win, doc, undef } from 'barfoos2.0/domkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import displayMarkup from '../markup/display.html';
import style from '../style/main.scss';
import displayStyle from '../style/display.scss';

/*****************************************************************************************************
 *  The commentSection Module handles user input for comments and stores it into a database
 *	It will also handle the display and visualization of existing comments for the context
 *****************************************************************************************************/
class commentSection extends mix( Component ).with( ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:			'commentSection',
			tmpl:			html
		}).and( input );

		super( options );

		this.runtimeDependencies.push(
			this.fire( 'waitForConnection.server' )
		);

		return this.init();
	}

	async init() {
		await super.init();

		this.nodes[ 'form.commentData' ].addEventListener( 'submit', this.sendComment.bind( this), false );
		this.nodes[ 'textarea.commentText' ].addEventListener( 'focusin', this.focusCommentText.bind( this), false );
		this.nodes[ 'textarea.commentText' ].addEventListener( 'focusout', this.focusoutCommentText.bind( this), false );
		this.nodes[ 'textarea.commentText' ].addEventListener( 'input', this.checkInput.bind( this), false );
		this.nodes[ 'input.cancelComment' ].addEventListener( 'click', this.blurCommentText.bind( this), false );
		this.nodes[ 'input.cancelComment' ].addEventListener( 'touchstart', this.blurCommentText.bind( this), false );

		this.on( 'mouseup.appEvents', this.delegatedClick, this );
		this.on( 'startNewSession.server', this.checkAdminRights, this );
		this.on( 'userLogout.server', this.checkAdminRights, this );

		this.recv( 'commentWasVoted', this.commentWasVoted.bind( this ) );
		this.recv( 'newCommentWasPosted', this.newCommentWasPosted.bind( this ) );

		if( this.small ) {
			this.nodes[ 'input.sendComment' ].classList.add( 'small' );
		}

		await this.getComments();

		this.fire( 'getUserSession.server', this.checkAdminRights.bind( this ) );

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style, displayStyle ].forEach( s => s.unuse() );
	}

	checkAdminRights( session ) {
		if( session ) {
			Array.from( this.nodes[ 'div.commentsList' ].querySelectorAll( '.isAdmin' ) ).forEach( node => node.style.display = session.__isAdmin && !session.__destroyed ? 'flex' : 'none' );
		}
	}

	delegatedClick( event ) {
		if( this.nodes.root.contains( event.target ) ) {
			if( event.target.classList.contains( 'thumbsUp' ) ) {
				this.voteClick( event.target.closest( 'div.commentWrapper' ), 'castUpvote' );
			}

			if( event.target.classList.contains( 'thumbsDown' ) ) {
				this.voteClick( event.target.closest( 'div.commentWrapper' ), 'castDownvote' );
			}

			if( event.target.classList.contains( 'reply' ) ) {
				this.replyClick( event.target.closest( 'div.commentWrapper' ) );
			}

			if( event.target.classList.contains( 'report' ) ) {
				if( event.target.classList.contains( 'alreadyReported' ) === false ) {
					this.reportClick( event.target.closest( 'div.commentWrapper' ) );
				}
			}

			if( event.target.classList.contains( 'showLocalResponses' ) ) {
				this.showLocalResponses( event.target.closest( 'div.commentWrapper' ) );
			}
		}
	}

	async voteClick( rootNode, vote ) {
		try {
			let commentid;

			if( rootNode ) {
				commentid = rootNode.closest( 'div.commentWrapper' ).dataset.commentid;

				let result = await this.send({
					type:		vote,
					payload:	{
						commentid:	commentid
					}
				});

				if( result.data.upvote ) {
					rootNode.querySelector( 'div.thumbsUp' ).classList.add( 'highlight' );
				} else {
					rootNode.querySelector( 'div.thumbsUp' ).classList.remove( 'highlight' );
				}

				if( result.data.downvote ) {
					rootNode.querySelector( 'div.thumbsDown' ).classList.add( 'highlight' );
				} else {
					rootNode.querySelector( 'div.thumbsDown' ).classList.remove( 'highlight' );
				}
			} else {
				throw new Error( 'voteClick: wrong formal arguments' );
			}
		} catch( ex ) {
			this.log( ex );

			this.createModalOverlay({ at: rootNode });
			await this.modalOverlay.log( ex.message );
			this.modalOverlay.fulfill();
		}
	}

	async replyClick( rootNode ) {
		try {
			let commentid;

			if( rootNode ) {
				if( rootNode.classList.contains( 'topLevel' ) ) {
					commentid = rootNode.dataset.commentid;
				} else {
					commentid = rootNode.closest( 'div.commentWrapper.topLevel' ).dataset.commentid;
				}

				Array.from( doc.querySelectorAll( 'div.subCommentInput' ) ).forEach( node => node.remove() );

				this.nodes.defaultChildContainer = doc.querySelector( `div.comment-${ commentid }` );

				let hash = this.render({ htmlData: html, standalone: true }).with({}).at({
					node:		rootNode.querySelector( 'div.actionsLine' ),
					position:	'afterend'
				});

				hash.localRoot.dataset.commentid = commentid;
				hash.localRoot.querySelector( 'textarea.commentText' ).value = `@${ rootNode.querySelector( 'div.author' ).textContent } `;
				hash.localRoot.classList.add( 'subCommentInput' );
				hash.localRoot.querySelector( 'form.commentData' ).addEventListener( 'submit', this.sendComment.bind( this), false );
				hash.localRoot.querySelector( 'textarea.commentText' ).addEventListener( 'focusin', this.focusCommentText.bind( this), false );
				hash.localRoot.querySelector( 'textarea.commentText' ).addEventListener( 'focusout', this.focusoutCommentText.bind( this), false );
				hash.localRoot.querySelector( 'textarea.commentText' ).addEventListener( 'input', this.checkInput.bind( this), false );
				hash.localRoot.querySelector( 'input.cancelComment' ).addEventListener( 'click', this.blurCommentText.bind( this), false );
				hash.localRoot.querySelector( 'input.cancelComment' ).addEventListener( 'touchstart', this.blurCommentText.bind( this), false );

				hash.localRoot.querySelector( 'textarea.commentText' ).focus();
			} else {
				throw new Error( 'replyClick: wrong formal arguments' );
			}
		} catch( ex ) {
			this.log( ex );
		}
	}

	async reportClick( rootNode ) {
		try {
			let commentid;

			if( rootNode ) {
				commentid = rootNode.closest( 'div.commentWrapper' ).dataset.commentid;

				let result = await this.send({
					type:		'reportComment',
					payload:	{
						commentid:	commentid
					}
				});

				rootNode.querySelector( 'div.report' ).textContent = result.msg;
				rootNode.querySelector( 'div.report' ).classList.add( 'alreadyReported' );
			} else {
				throw new Error( 'reportClick: wrong formal arguments' );
			}
		} catch( ex ) {
			this.log( ex );
		}
	}

	showLocalResponses( rootNode ) {
		let resContainer	= rootNode.querySelector( 'div.responseContainer' ),
			localResponses	= rootNode.querySelector( 'div.showLocalResponses' );

		if( resContainer.classList.contains( 'show' ) ) {
			resContainer.classList.remove( 'show' );
			localResponses.textContent = `Antworten anzeigen (${ localResponses.dataset.responsecount })`;
		} else {
			resContainer.classList.add( 'show' );
			localResponses.textContent = 'Antworten ausblenden';
		}
	}

	async getComments() {
		try {
			let result = await this.send({
				type:		'getInitialComments',
				payload:	{
					context:		this.context,
					speakingName:	this.speakingName
				}
			});

			for( let comment of result.data.comments ) {
				await this.renderComment({ comment: comment, srcArray: result.data.comments });
			}
		} catch( ex ) {
			this.createModalOverlay();
			await this.modalOverlay.log( ex.message );
			this.modalOverlay.fulfill();
		}
	}

	focusCommentText( event ) {
		let root		= event.target.closest( 'div.commentSection' ),
			cancelBtn	= root.querySelector( 'input.cancelComment' );

		cancelBtn.classList.add( 'active' );

		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		'commenting'
			}
		});
	}

	focusoutCommentText() {
		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		'videoPlayerDialog'
			},
			extra:	this.context
		});
	}

	blurCommentText( event ) {
		let root		= event.target.closest( 'div.commentSection' ),
			cancelBtn	= root.querySelector( 'input.cancelComment' ),
			commentText	= root.querySelector( 'textarea.commentText' );

		Array.from( doc.querySelectorAll( 'div.subCommentInput' ) ).forEach( node => node.remove() );
		commentText.value = '';
		cancelBtn.classList.remove( 'active' );
	}

	checkInput( event ) {
		let root		= event.target.closest( 'div.commentSection' ),
			commentArea	= root.querySelector( 'textarea.commentText' ),
			comment		= commentArea.value;

		if( comment.length < 6 ) {
			commentArea.setCustomValidity( 'Ein klein wenig ausführlicher bitte...' );
		} else if( comment.length > 1024 ) {
			commentArea.setCustomValidity( 'Vielleicht nicht ganz so ausführlich...?' );
		} else {
			commentArea.setCustomValidity( '' );
		}
	}

	async sendComment( event ) {
		event.stopPropagation();
		event.preventDefault();

		let root		= event.target.closest( 'div.commentSection' ),
			sendBtn		= root.querySelector( 'input.sendComment' ),
			cancelBtn	= root.querySelector( 'input.cancelComment' ),
			commentArea	= root.querySelector( 'textarea.commentText' ),
			form		= root.querySelector( 'form.commentData' ),
			cid			= root.dataset.commentid;

		sendBtn.setAttribute( 'disabled', 'disabled' );
		//this.removeNodeEvent( 'form.commentData', 'submit', this.sendComment );

		try {
			let result = await this.send({
				type:		'newComment',
				payload:	{
					content:		commentArea.value,
					context:		this.context,
					internalId:		this.internalId,
					speakingName:	this.speakingName,
					reference:		cid || ''
				}
			});

			if( result.data.success ) {
				let commentWrapper = root.closest( 'div.commentWrapper.topLevel' );

				if( commentWrapper ) {
					commentWrapper.querySelector( 'div.responseContainer' ).classList.add( 'show' );
					commentWrapper.querySelector( 'div.showLocalResponses' ).textContent = 'Antworten ausblenden';
				}

				Array.from( doc.querySelectorAll( 'div.subCommentInput' ) ).forEach( node => node.remove() );
				commentArea.value = '';
				this.blurCommentText({ target: cancelBtn });
			}
		} catch( ex ) {
			this.createModalOverlay({
				at:	form
			});

			await this.modalOverlay.log( ex.message );
			this.modalOverlay.fulfill();
		}

		//this.addNodeEvent( 'form.commentData', 'submit', this.sendComment );
		sendBtn.removeAttribute( 'disabled' );
	}

	async renderComment({ comment, srcArray, fadeIn }) {
		let targetContainer, responseCount;

		// extend comment data with locally calculated time offset and voting relation
		comment.timePeriod		= `schrieb vor ${ getTimePeriod( comment.creationDate ) }`;
		comment.voting			= (comment.upvotesCount - comment.downvotesCount) || 0;
		comment.responseCount	= 0;
		comment.fadeIn			= fadeIn ? 'fadeIn' : '';

		if( Array.isArray( srcArray ) ) {
			responseCount = srcArray.filter( cmp => {
				return cmp.reference === comment._id;
			}).length;

			comment.responseCount = responseCount || 0;
		}

		if( comment.reference ) {
			targetContainer = doc.querySelector( `div.comment-${ comment.reference } > div.responseWrapper > div.responseContainer` );
		} else {
			targetContainer	= 'div.commentsList';
		}

		let hash = this.render({ htmlData: displayMarkup, standalone: true }).with( comment ).at({
			node:		targetContainer,
			position:	comment.reference ? 'beforeend' : 'afterbegin'
		});

		if( fadeIn ) {
			hash.localRoot.addEventListener( 'animationend', () => {
				hash.localRoot.classList.remove( 'fadeIn' );
			}, false);
		}

		if( comment.reference ) {
			hash.localRoot.classList.add( 'subComment' );
			hash.localRoot.classList.remove( 'topLevel' );
			hash.localRoot.querySelector( 'div.responseWrapper' ).remove();

			if( srcArray === undef ) {
				let localRes			= hash.localRoot.closest( 'div.commentWrapper.topLevel' ).querySelector( 'div.showLocalResponses' ),
					localResContainer	= hash.localRoot.closest( 'div.commentWrapper.topLevel' ).querySelector( 'div.responseContainer' );

				localRes.dataset.responsecount	= win.parseInt( localRes.dataset.responsecount, 10 ) + 1;

				if(!localResContainer.classList.contains( 'show' ) ) {
					localRes.textContent			= `Antworten anzeigen (${ localRes.dataset.responsecount })`;
				}
			}
		}

		if( comment.wasUpvoted ) {
			hash.localRoot.querySelector( 'div.thumbsUp' ).classList.add( 'highlight' );
		} else if( comment.wasDownvoted ) {
			hash.localRoot.querySelector( 'div.thumbsDown' ).classList.add( 'highlight' );
		}

		if( comment.voting < 0 ) {
			hash.localRoot.querySelector( 'div.voting' ).classList.add( 'negative' );
		} else if( comment.voting > 0 ) {
			hash.localRoot.querySelector( 'div.voting' ).classList.add( 'positive' );
		} else {
			hash.localRoot.querySelector( 'div.voting' ).classList.remove( 'negative', 'positive' );
		}
	}

	commentWasVoted( data ) {
		let rootNode = doc.querySelector( `div.comment-${ data.commentid }` );

		let voteResult = data.upvoteCount - data.downvoteCount;
		rootNode.querySelector( 'div.voting' ).textContent = voteResult;

		if( voteResult < 0 ) {
			rootNode.querySelector( 'div.voting' ).classList.add( 'negative' );
		} else if( voteResult > 0 ) {
			rootNode.querySelector( 'div.voting' ).classList.add( 'positive' );
		} else {
			rootNode.querySelector( 'div.voting' ).classList.remove( 'negative', 'positive' );
		}
	}

	newCommentWasPosted( comment ) {
		this.renderComment({ comment: comment, fadeIn: true });
	}
}
/****************************************** commentSection End ******************************************/

async function start( ...args ) {
	[ style, displayStyle ].forEach( style => style.use() );

	return await new commentSection( ...args );
}

export { start };
