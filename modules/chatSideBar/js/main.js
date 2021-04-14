'use strict';

import { Component } from 'barfoos2.0/core.js';
import { moduleLocations, VK } from 'barfoos2.0/defs.js';
import { extend, Mix, intToRGB, hashCode, getTimePeriod } from 'barfoos2.0/toolkit.js';
import { win, undef } from 'barfoos2.0/domkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';
import Speech from 'barfoos2.0/speech.js';

import html from '../markup/main.html';
import chatMessageElementMarkup from '../markup/chatMessageElement.html';
import userInListMarkup from '../markup/userInListElement.html';
import style from '../style/main.scss';
import chatMessageElementStyle from '../style/chatMessageElement.scss';
import userInListStyle from '../style/userInListElement.scss';

/*****************************************************************************************************
 *  Chat Sidebar
 *****************************************************************************************************/
class ChatSideBar extends Mix( Component ).With( ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:			'ChatSideBar',
			location:		moduleLocations.right,
			tmpl:			html,
			firstLogin:		true,
			session:		Object.create( null )
		}).and( input );

		super( options );

		extend( this ).with({
			usersTyping:			Object.create( null )
		});

		return this.init();
	}

	async init() {
		await super.init();

		this.userList	= {
			add:				this.addUserToUserList.bind( this ),
			remove:				this.removeUserFromUserList.bind( this ),
			idle:				this.markUserAsIdle.bind( this ),
			removeIdle:			this.removeUserAsIdle.bind( this ),
			update:				this.updateUserFromUserList.bind( this ),
			typing:				this.setUserAsTyping.bind( this ),
			removeTyping:		this.removeAsTyping.bind( this )
		};

		this.addNodeEvent( 'ul.topMenu', 'click', this.switchWindow );
		this.addNodeEvent( 'textarea.inputChatMessage', 'keydown', this.onTyping );
		this.addNodeEvent( 'textarea.inputChatMessage', 'focusin', this.onInputChatFocus );
		this.addNodeEvent( 'textarea.inputChatMessage', 'focusout', this.onInputChatBlur );
		this.addNodeEvent( 'input.sendChatMessage', 'click', this.sendMessage );

		this.recv( 'dispatchedChatMessage', this.receivedDispatchedChatMessage.bind( this ) );
		this.recv( 'updatedChatMessage', this.updatedChatMessage.bind( this ) );
		this.recv( 'deletedChatMessage', this.deletedChatMessage.bind( this ) );
		this.recv( 'newUserLogin', this.newUserLogin.bind( this ) );
		this.recv( 'userLogout', this.userLogout.bind( this ) );
		this.recv( 'userIsTyping', this.userIsTyping.bind( this ) );

		//this.recv( 'userConnectionUpdate', this.userConnectionUpdate.bind( this ) );
		this.recv( 'userActionUpdate', this.userActionUpdate.bind( this ) );
		this.recv( 'userHasGoneIdle', this.userHasGoneIdle.bind( this ) );
		this.recv( 'userHasReturnedFromIdle', this.userHasReturnedFromIdle.bind( this ) );
		this.recv( 'userIdleTimeoutExceeded', this.userIdleTimeoutExceeded.bind( this ) );

		this.on( 'startNewSession.server', this.onNewSession.bind( this ) );
		this.on( 'disconnect.server', this.onDisconnect.bind( this ) );
		this.on( 'reconnect.server', this.onReconnect.bind( this ) );
		this.on( 'userLogout.server', this.onSelfLogout.bind( this ) );
		this.on( 'mobileChatEnabled', this.onMobileChat.bind( this ) );

		this.getPingMessages();

		/*if( this.speechNotAvailable ) {
			this.nodes[ 'div.readChat' ].remove();
		}*/

		this.nodes[ 'textarea.inputChatMessage' ].focus();

		await this.fire( 'waitForConnection.server' );

		this.session = await this.fire( 'getUserSession.server' );

		if( this.session === null ) {
			this.session = Object.create( null );
		}

		await this.getInitialChatData({ showMOTD: this.firstLogin });

		this.firstLogin = false;

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style, chatMessageElementStyle, userInListStyle ].forEach( s => s.unuse() );
	}

	async inViewport() {
		super.inViewport && super.inViewport( ...arguments );

		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		this.name,
				ref:		this.name
			}
		});
	}

	async offViewport() {
		super.offViewport && super.offViewport( ...arguments );
	}

	switchWindow( event ) {
		for( let li of Array.from( this.nodes[ 'ul.topMenu' ].children ) ) {
			if( event.originalTarget === li ) {
				li.classList.add( 'active' );
				this.nodes[ `section.${ li.dataset.link }` ].style.display = 'flex';
			} else {
				li.classList.remove( 'active' );
				this.nodes[ `section.${ li.dataset.link }` ].style.display = 'none';
			}
		}
	}

	async onNewSession( user ) {
		this.username = user.__username;
		this.session = user;

		await this.getInitialChatData({ showMOTD: this.firstLogin });
		//this.nodes[ 'div.username' ].textContent = this.username + ':';


		/*this.putLine({
			from:				'Client',
			content:			'Verbindung hergestellt',
			extraClasses:		'serverNotification'
		});*/
	}

	onDisconnect( reason ) {
		/*this.putLine({
			from:				'Client',
			content:			`Verbindung unterbrochen: ${ reason }`,
			extraClasses:		'serverNotification'
		});*/

		this.username = '';
		//this.nodes[ 'div.username' ].textContent = '';
		this.nodes[ 'section.userListSection' ].innerHTML = '';
		//this.nodes[ 'div.usersOnlineTotalNumber' ].textContent = '';
		//this.nodes[ 'div.usersOnlineLoggedInNumber' ].textContent = '';

		/*if( this.nodes[ 'input#readChatInput' ].checked ) {
			this.read( 'Verbindung unterbrochen, das Vorlesen wird eingestellt.' );
			this.nodes[ 'input#readChatInput' ].checked = false;
		}*/
	}

	async onReconnect() {
		await this.getInitialChatData({ showMOTD: this.firstLogin });
	}

	onSelfLogout() {
		this.onDisconnect( 'Logout' );
	}

	async onMobileChat() {
		await this.timeout( 200 );
		this.scrollToEnd();
	}

	updateTimeOffsets() {
		if( this.timeOffsetTimer ) {
			win.clearTimeout( this.timeOffsetTimer );
			this.timeOffsetTimer = null;
		}

		Array.from( this.nodes[ 'div.chatMessages' ].querySelectorAll( 'div.timeDiff' ) ).forEach( timeDiffNode => {
			let timestamp = timeDiffNode.dataset.timestamp;
			timeDiffNode.textContent = timestamp ? `[Vor ${ getTimePeriod( timestamp ) }]` : '';
		});

		Array.from( this.nodes[ 'section.userListSection' ].querySelectorAll( 'div.idle' ) ).forEach( idleUser => {
			idleUser.querySelector( 'div.status' ).textContent = `Abwesend seit ${ getTimePeriod( idleUser.dataset.since ) }`;
		});

		this.timeOffsetTimer = win.setTimeout( this.updateTimeOffsets.bind( this ), (Math.random()*60) * 1000 );
	}

	async getInitialChatData({ showMOTD = false } = { }) {
		try {
			let result = await this.send({
				type:		'getInitialChatData'
			});
			
			this.nodes[ 'div.chatMessages' ].innerHTML = '';

			this.username = result.data.username || 'anonym';

			if( Array.isArray( result.data.history ) ) {
				for( let entry of result.data.history ) {
					let modifierClasses = [ ];

					if( this.session.__isAdmin ) {
						modifierClasses.push( 'adminVerified' );
					}

					if( this.username !== entry.from && entry.content.indexOf( `@${ this.username }` ) > -1 ) {
						modifierClasses.push( 'pingMessage' );
					}

					this.putLine( Object.assign( { extraClasses: modifierClasses.join( ' ' ) }, entry ) );
				}
			}

			if( Array.isArray( result.data.loggedInUsers ) ) {
				for( let user of result.data.loggedInUsers ) {
					this.userList.add( user.name, user.action, user.isIdle );
				}
			}

			if( showMOTD && typeof result.data.messageOfTheDay === 'string' ) {
				this.putLine({
					from:				'Server',
					content:			result.data.messageOfTheDay,
					extraClasses:		'serverNotification'
				});
			}

			//this.nodes[ 'div.username' ].textContent = this.username + ':';
			//this.nodes[ 'div.usersOnlineTotalNumber' ].textContent = result.data.totalUsersCount;
			//this.nodes[ 'div.usersOnlineLoggedInNumber' ].textContent = result.data.loggedInUsersCount;
		} catch( ex ) {
			this.putLine({
				from:				'Server',
				content:			ex.message,
				extraClasses:		'serverNotification'
			});
		}
	}

	async getPingMessages() {
		if( Array.isArray( this.pingMessages ) && this.pingMessages.length ) {
			this.pingMessages.forEach( data => {
				this.putLine( Object.assign( { extraClasses: 'pingMessage' }, data ) );
			});
		}
	}

	async onEditText( event ) {
		let root			= event.target.closest( 'div.chatMessageElement' ),
			userText		= root.querySelector( 'div.userTextContent' );

		if( userText.isContentEditable ) {
			userText.contentEditable = false;
			event.target.textContent = '✍';

			let result = await this.send({
				type:	'updateChatMessage',
				payload:	{
					from:		root.dataset.from,
					timestamp:	root.dataset.timestamp,
					message:	userText.textContent
				}
			});
		} else {
			userText.contentEditable = true;
			event.target.textContent = '✓';

			userText.focus();
		}
	}

	async onDeleteComment( event ) {
		let root			= event.target.closest( 'div.chatMessageElement' );

		if( win.confirm( 'Soll der Kommentar wirklich entfernt werden?' ) ) {
			let result = await this.send({
				type:	'deleteChatMessage',
				payload:	{
					from:		root.dataset.from,
					timestamp:	root.dataset.timestamp
				}
			});
		}
	}

	async onBanUser( event ) {
		let root			= event.target.closest( 'div.chatMessageElement' );

		if( win.confirm( `Soll der Benutzer ${ root.dataset.from } wirklich gesperrt werden?` ) ) {
			let result = await this.send({
				type:	'banUser',
				payload:	{
					from:		root.dataset.from,
					timestamp:	root.dataset.timestamp
				}
			});
		}
	}

	async sendMessage() {
		try {
			this.removeNodeEvent( 'textarea.inputChatMessage', 'keydown', this.onTyping );
			this.removeNodeEvent( 'input.sendChatMessage', 'click', this.sendMessage );

			let sendData = this.nodes[ 'textarea.inputChatMessage' ].value;

			if( sendData.trim().length > 400 ) {
				throw new Error( 'Es sind maximal 400 Zeichen pro Nachricht erlaubt.' );
			}

			if( sendData.trim().length ) {
				let result = await this.send({
					type:		'chatMessage',
					payload:	{
						message:	sendData
					}
				});

				this.nodes[ 'textarea.inputChatMessage' ].value = '';
				this.nodes[ 'textarea.inputChatMessage' ].focus();

				if( result.data.messageDelivered ) {
					this.addNodeEvent( 'textarea.inputChatMessage', 'keydown', this.onTyping );
					this.addNodeEvent( 'input.sendChatMessage', 'click', this.sendMessage );
				}

				if( result.data.response ) {
					this.putLine({
						from:				'Server',
						content:			result.data.response,
						extraClasses:		'serverNotification'
					});
				}
			} else {
				throw new Error( 'Du hast wohl nicht viel zu sagen...?' );
			}
		} catch( ex ) {
			this.putLine({
				from:				'Server',
				content:			ex.message,
				extraClasses:		'serverNotification'
			});

			this.addNodeEvent( 'textarea.inputChatMessage', 'keydown', this.onTyping );
			this.addNodeEvent( 'input.sendChatMessage', 'click', this.sendMessage );
		}
	}

	async receivedDispatchedChatMessage( data ) {
		let modifierClasses = [ ];

		this.userList.removeTyping( data.from );

		if( this.session.__isAdmin ) {
			modifierClasses.push( 'adminVerified' );
		}

		if( this.username !== data.from && data.content.indexOf( `@${ this.username }` ) > -1 ) {
			modifierClasses.push( 'pingMessage' );
		}

		this.putLine( Object.assign( { extraClasses: modifierClasses.join( ' ' ) }, data ) );
	}

	async updatedChatMessage( data ) {
		try {
			let targetNode = this.nodes[ 'div.chatMessages' ].querySelector( `div.chatMessageElement[data-from="${ data.from }"][data-timestamp="${ data.time }"]` );

			if( targetNode ) {
				targetNode.querySelector( 'div.userTextContent' ).textContent = data.content;
			}
		} catch( ex ) {
			this.log( ex.message );
		}
	}

	async deletedChatMessage( data ) {
		try {
			let targetNode = this.nodes[ 'div.chatMessages' ].querySelector( `div.chatMessageElement[data-from="${ data.from }"][data-timestamp="${ data.time }"]` );

			if( targetNode ) {
				targetNode.remove();
			}
		} catch( ex ) {
			this.log( ex.message );
		}
	}

	async newUserLogin( data ) {
		this.userList.add( data.username, 'Hat sich gerade angemeldet...' );

		//this.nodes[ 'div.usersOnlineTotalNumber' ].textContent = data.totalUsersCount;
		//this.nodes[ 'div.usersOnlineLoggedInNumber' ].textContent = data.loggedInUsersCount;
	}

	async userLogout( data ) {
		let match = this.nodes[ 'section.userListSection' ].querySelector( `div.user-${ data.username }` );

		if( match && match.classList.contains( 'idle' ) === false ) {
			this.userList.remove( data.username );

			//this.nodes[ 'div.usersOnlineTotalNumber' ].textContent = data.totalUsersCount;
			//this.nodes[ 'div.usersOnlineLoggedInNumber' ].textContent = data.loggedInUsersCount;
		}
	}

	async userIsTyping( data ) {
		this.userList.typing( data.username );
	}

	async userActionUpdate( data ) {
		this.userList.update( data );
	}

	async userHasGoneIdle( data ) {
		this.userList.idle( data.username );
	}

	async userHasReturnedFromIdle( data ) {
		this.userList.removeIdle( data.username );
	}

	async userIdleTimeoutExceeded( data ) {
		this.userList.removeIdle( data.username );
		this.userList.remove( data.username );
	}

	onInputChatFocus( event ) {
		event.stopPropagation();
		event.preventDefault();

		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		this.name
			}
		});

		//if( isMobileDevice ) {
		//	doc.body.scrollTop = 160;
		//}

		return false;
	}

	onInputChatBlur() {
		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		'',
			}
		});
	}

	onUserNameClick( event ) {
		let chatMsg		= this.nodes[ 'textarea.inputChatMessage' ].value,
			username	= event.target.dataset.username;

		if( chatMsg.indexOf( `@${ username }` ) === -1 ) {
			this.nodes[ 'textarea.inputChatMessage' ].value = `@${ username  } ${ chatMsg }`;
		}
	}

	onTyping( event ) {
		if( event.which === VK.RETURN && !event.shiftKey ) {
			event.preventDefault();
			event.stopPropagation();
			this.sendMessage();
			return;
		}

		if( this.usersTyping[ this.username ] === undef ) {
			if( event.which >= 48 && event.which <= 90 && !event.ctrlKey && !event.metaKey ) {
				this.send({
					type:		'userInputNotification'
				}, {
					simplex:	true
				});
			}
		}
	}

	addUserToUserList( name, action, isIdle ) {
		this.removeUserFromUserList( name );

		this.render({ htmlData:	userInListMarkup, standalone: true }).with({
			name:		name,
			status:		action,
			isIdle:		isIdle ? 'idle' : '',
			admin:		name === 'DerVeganeGermane' ? 'admin' : ''
		}).at({
			node:		'section.userListSection',
			position:	'beforeend'
		});
	}

	markUserAsIdle( name ) {
		let match = this.nodes[ 'section.userListSection' ].querySelector( `div.user-${ name }` );

		if( match ) {
			match.classList.add( 'idle' );
			match.dataset.since = Date.now();
			match.querySelector( 'div.status' ).textContent = `Abwesend seit ${ getTimePeriod( match.dataset.since ) }`;
		}
	}

	removeUserAsIdle( name ) {
		let match = this.nodes[ 'section.userListSection' ].querySelector( `div.user-${ name }` );

		if( match ) {
			match.classList.remove( 'idle' );
		}
	}

	removeUserFromUserList( name ) {
		let match = this.nodes[ 'section.userListSection' ].querySelector( `div.user-${ name }` );

		if( match ) {
			match.remove();
		}
	}

	updateUserFromUserList( updateData ) {
		let match = this.nodes[ 'section.userListSection' ].querySelector( `div.user-${ updateData.from }` );

		if( match ) {
			if( updateData.action ) {
				match.querySelector( 'div.status' ).textContent = updateData.action;
			}
		}
	}

	setUserAsTyping( name ) {
		let match = this.nodes[ 'section.userListSection' ].querySelector( `div.user-${ name } > div.wrapper > div.typingStatus` );

		if( match ) {
			match.classList.add( 'isTyping' );

			this.usersTyping[ name ] = win.setTimeout(() => {
				this.removeAsTyping( name );
			}, 1000 * 15);
		}
	}

	removeAsTyping( name ) {
		let match = this.nodes[ 'section.userListSection' ].querySelector( `div.user-${ name } > div.wrapper > div.typingStatus` );

		if( match ) {
			win.clearTimeout( this.usersTyping[ name ] );
			delete this.usersTyping[ name ];

			match.classList.remove( 'isTyping' );
		}
	}

	paint( input ) {
		let hashColor = intToRGB( hashCode( input ) );
		return `<div class="chatUserNamePainted" data-username="${ input }" title="${ input }" style="color: #${ hashColor }">${ input }:</div>`;
	}

	scrollToEnd() {
		this.nodes[ 'div.chatMessages' ].scrollTop = this.nodes[ 'div.chatMessages' ].scrollHeight;
	}

	putLine({ from, content, time, extraClasses }) {
		let chatMessageElements = this.nodes[ 'div.chatMessages' ].children;

		if( chatMessageElements.length > 50 ) {
			chatMessageElements[ 0 ].remove();
		}

		this.updateTimeOffsets();

		this.render({ htmlData:	chatMessageElementMarkup, standalone: true }).with({
			time:			time,
			from:			from,
			timeDiff:		time ? `[Vor ${ getTimePeriod( time ) }]` : '',
			fromFormatted:	this.paint( from ),
			content:		content,
			extraClasses:	extraClasses || ''
		}).at({
			node:		'div.chatMessages',
			position:	'beforeend'
		});

		this.scrollToEnd();

		/*if( this.nodes[ 'input#readChatInput' ].checked ) {
			this.read( `${ from } schreibt: ${ content }` );
		}*/
	}
}
/****************************************** privacySection End ******************************************/

async function start( ...args ) {
	[ style, chatMessageElementStyle, userInListStyle ].forEach( style => style.use() );

	return await new ChatSideBar( ...args );
}

export { start };
