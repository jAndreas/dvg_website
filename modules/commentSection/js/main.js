'use strict';

import { Component } from 'barfoos2.0/core.js';
import { Mix, getTimePeriod, isLocalChrome } from 'barfoos2.0/toolkit.js';
import { extend } from 'barfoos2.0/toolkit.js';
import { win, undef } from 'barfoos2.0/domkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import displayMarkup from '../markup/display.html';
import style from '../style/main.scss';
import displayStyle from '../style/display.scss';

/*****************************************************************************************************
 *  The commentSection Module handles user input for comments and stores it into a database
 *	It will also handle the display and visualization of existing comments for the context
 *****************************************************************************************************/
class CommentSection extends Mix( Component ).With( ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:			'CommentSection',
			tmpl:			html,
			inEditMode:		Object.create( null ),
			session:		null,
			allComments:	[ ]
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
		this.nodes[ 'textarea.commentText' ].addEventListener( 'focus', this.focusCommentText.bind( this), false );
		this.nodes[ 'textarea.commentText' ].addEventListener( 'blur', this.focusoutCommentText.bind( this), false );
		this.nodes[ 'textarea.commentText' ].addEventListener( 'input', this.checkInput.bind( this), false );
		this.nodes[ 'input.cancelComment' ].addEventListener( 'click', this.blurCommentText.bind( this), false );
		this.nodes[ 'input.cancelComment' ].addEventListener( 'touchstart', this.blurCommentText.bind( this), false );

		this.on( 'mouseup.appEvents', this.delegatedClick, this );
		this.on( 'startNewSession.server', this.checkAdminRights, this );
		this.on( 'userLogout.server', this.checkAdminRights, this );

		this.recv( 'commentWasVoted', this.commentWasVoted.bind( this ) );
		this.recv( 'newCommentWasPosted', this.newCommentWasPosted.bind( this ) );
		this.recv( 'commentWasUpdated', this.commentWasUpdated.bind( this ) );
		this.recv( 'commentWasRemoved', this.commentWasRemoved.bind( this ) );

		if( this.small ) {
			this.nodes[ 'input.sendComment' ].classList.add( 'small' );
		}

		this.fire( 'getUserSession.server', session => this.session = session );

		if(!isLocalChrome ) {
			await this.getComments();
		}

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style, displayStyle ].forEach( s => s.unuse() );
	}

	checkAdminRights( session ) {
		if( session ) {
			for( let comment of this.allComments ) {
				if( session.__isAdmin || comment.author === session.__username ) {
					comment.node.querySelectorAll( '.isAdmin' ).forEach( node => node.style.display = session.__destroyed ? 'none' : 'flex' );
				}
			}
		}
	}

	delegatedClick( event ) {
		if( this.nodes.root.contains( event.target ) ) {
			let commentWrapper = event.target.closest( 'div.commentWrapper' );

			if( event.target.classList.contains( 'thumbsUp' ) ) {
				this.voteClick( commentWrapper, 'castUpvote' );
			}

			if( event.target.classList.contains( 'thumbsDown' ) ) {
				this.voteClick( commentWrapper, 'castDownvote' );
			}

			if( event.target.classList.contains( 'reply' ) ) {
				this.replyClick( commentWrapper );
			}

			if( event.target.classList.contains( 'report' ) ) {
				if( event.target.classList.contains( 'alreadyReported' ) === false ) {
					this.reportClick( commentWrapper );
				}
			}

			if( event.target.classList.contains( 'showLocalResponses' ) ) {
				this.showLocalResponses( commentWrapper );
			}

			if( event.target.classList.contains( 'edit' ) ) {
				if( event.target.classList.contains( 'inEditMode' ) ) {
					this.editContent( commentWrapper, event.target );
				} else {
					this.makeContentEditable( commentWrapper, event.target );
				}
			}

			if( event.target.classList.contains( 'remove' ) ) {
				this.removeComment( commentWrapper );
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

				Array.from( this.nodes[ 'div.commentsList' ].querySelectorAll( 'div.subCommentInput' ) ).forEach( node => node.remove() );

				this.nodes.defaultChildContainer = this.nodes[ 'div.commentsList' ].querySelector( `div.comment-${ commentid }` );

				let hash = this.render({ htmlData: html, standalone: true }).with({}).at({
					node:		rootNode.querySelector( 'div.actionsLine' ),
					position:	'afterend'
				});

				hash.localRoot.dataset.commentid = commentid;
				hash.localRoot.querySelector( 'textarea.commentText' ).value = `@${ rootNode.querySelector( 'div.author' ).textContent } `;
				hash.localRoot.classList.add( 'subCommentInput' );
				hash.localRoot.querySelector( 'form.commentData' ).addEventListener( 'submit', this.sendComment.bind( this), false );
				hash.localRoot.querySelector( 'textarea.commentText' ).addEventListener( 'focus', this.focusCommentText.bind( this), false );
				hash.localRoot.querySelector( 'textarea.commentText' ).addEventListener( 'blur', this.focusoutCommentText.bind( this), false );
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

	async editContent( rootNode, target ) {
		try {
			let commentid;

			if( rootNode ) {
				this.createModalOverlay({
					at:	rootNode
				});

				commentid = rootNode.closest( 'div.commentWrapper' ).dataset.commentid;

				if( commentid in this.inEditMode ) {
					let result = await this.send({
						type:		'editCommentContent',
						payload:	{
							context:	this.context,
							commentid:	commentid,
							content:	this.inEditMode[ commentid ].editInput.localRoot.value
						}
					});

					this.inEditMode[ commentid ].originalNode.innerHTML = result.data.comment.content.replace( /\n/g, '<br/>' );
					this.inEditMode[ commentid ].editInput.localRoot.replaceWith( this.inEditMode[ commentid ].originalNode );
					delete this.inEditMode[ commentid ];

					target.textContent	= 'Bearbeiten';
					target.classList.remove( 'inEditMode' );

					this.modalOverlay.fulfill();
				}
			}
		} catch( ex ) {
			this.createModalOverlay({
				at:	rootNode
			});

			await this.modalOverlay.log( ex.message );
			this.modalOverlay.fulfill();
		}
	}

	makeContentEditable( rootNode, target ) {
		try {
			let originalNode	= rootNode.querySelector( 'div.content' ),
				commentid		= rootNode.closest( 'div.commentWrapper' ).dataset.commentid,
				editInput		= this.render({ htmlData: '<textarea style="width:%width%px;height:%height%px;background-color:transparent;">%text%</textarea>', standalone: true, crlf: true }).with({
					text:			originalNode.innerHTML,
					width:			originalNode.offsetWidth,
					height:			originalNode.offsetHeight
				}).at({
					node:		originalNode,
					position:	'replace'
				});

			target.textContent	= 'Senden';
			target.classList.add( 'inEditMode' );

			this.inEditMode[ commentid ] = { originalNode, editInput };
		} catch( ex ) {
			this.log( ex );
		}
	}

	async removeComment( rootNode ) {
		try {
			let commentid	= rootNode.closest( 'div.commentWrapper' ).dataset.commentid;

			if( win.confirm( 'Diesen Kommentar löschen?' ) ) {
				await this.send({
					type:		'removeComment',
					payload:	{
						context:	this.context,
						commentid:	commentid
					}
				});
			}
		} catch( ex ) {
			this.createModalOverlay({
				at:	rootNode
			});

			await this.modalOverlay.log( ex.message );
			this.modalOverlay.fulfill();
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

			this.nodes[ 'div.commentsList' ].remove();
			for( let comment of result.data.comments ) {
				await this.renderComment({ comment: comment, srcArray: result.data.comments });
			}
			this.nodes[ 'div.commentInput' ].insertAdjacentElement( 'afterend', this.nodes[ 'div.commentsList' ] );
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

		event.stopPropagation();
		event.preventDefault();
		return false;
	}

	focusoutCommentText() {
		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		this.location
			},
			extra:	this.context
		});
	}

	blurCommentText( event ) {
		let root		= event.target.closest( 'div.commentSection' ),
			cancelBtn	= root.querySelector( 'input.cancelComment' ),
			commentText	= root.querySelector( 'textarea.commentText' );

		Array.from( this.nodes[ 'div.commentsList' ].querySelectorAll( 'div.subCommentInput' ) ).forEach( node => node.remove() );
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

		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		'commenting'
			}
		});

		event.stopPropagation();
		event.preventDefault();
		return false;
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

				Array.from( this.nodes[ 'div.commentsList' ].querySelectorAll( 'div.subCommentInput' ) ).forEach( node => node.remove() );
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
			targetContainer = this.nodes[ 'div.commentsList' ].querySelector( `div.comment-${ comment.reference } > div.responseWrapper > div.responseContainer` );
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

		if( this.session && ( this.session.__isAdmin || this.session.__username === comment.author ) ) {
			hash.localRoot.querySelectorAll( '.isAdmin' ).forEach( node => node.style.display = 'flex' );
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

		comment.node = hash.localRoot;

		this.allComments.push( comment );
	}

	commentWasVoted( data ) {
		let rootNode = this.nodes[ 'div.commentsList' ].querySelector( `div.comment-${ data.commentid }` );

		if( rootNode ) {
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
	}

	newCommentWasPosted( comment ) {
		if( comment.context === this.context ) {
			this.renderComment({ comment: comment, fadeIn: true });
		}
	}

	async commentWasUpdated( comment ) {
		let rootNode = this.nodes[ 'div.commentsList' ].querySelector( `div.comment-${ comment._id }` );

		if( rootNode ) {
			let ctn	= rootNode.querySelector( 'div.content' );

			let fade = await this.transition({
				node:	ctn,
				style:	{ opacity:	{ from: 1, to: '0.25' } },
				rules:	{
					duration:	400,
					timing:		'linear'
				}
			});

			ctn.innerHTML = comment.content.replace( /\n/g, '<br/>' );

			fade.undo();
		}
	}

	async commentWasRemoved( id ) {
		let rootNode = this.nodes[ 'div.commentsList' ].querySelector( `div.comment-${ id }` );

		if( rootNode ) {
			rootNode.remove();
		}

		let index	= -1,
			comment = this.allComments.find( (comment, idx) => {
				index = idx;
				return comment._id === id;
			});

		if( comment ) {
			comment.node.remove();
			this.allComments.splice( index, 1 );
		}
	}
}
/****************************************** commentSection End ******************************************/

async function start( ...args ) {
	[ style, displayStyle ].forEach( style => style.use() );

	return await new CommentSection( ...args );
}

export { start };
