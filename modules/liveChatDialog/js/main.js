'use strict';

import { Overlay, Draggable } from 'barfoos2.0/dialog.js';
import { moduleLocations, VK } from 'barfoos2.0/defs.js';
import { extend, Mix, intToRGB, hashCode, getTimePeriod, isMobileDevice } from 'barfoos2.0/toolkit.js';
import { win, doc, undef } from 'barfoos2.0/domkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import chatMessageElementMarkup from '../markup/chatMessageElement.html';
import userInListMarkup from '../markup/userInListElement.html';
import style from '../style/main.scss';
import chatMessageElementStyle from '../style/chatMessageElement.scss';
import userInListStyle from '../style/userInListElement.scss';


/*****************************************************************************************************
 *  The live chat user interaction interface
 *****************************************************************************************************/
class LiveChatDialog extends Mix( Overlay ).With( Draggable, ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:					'LiveChatDialog',
			location:				moduleLocations.center,
			tmpl:					html,
			title:					'Live Chat',
			topMost:				true,
			fixed:					true,
			avoidOutsideClickClose:	true,
			hoverOverlay:			{
				maximize:		true,
				close:			true
			}
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
			update:				this.updateUserFromUserList.bind( this ),
			typing:				this.setUserAsTyping.bind( this ),
			removeTyping:		this.removeAsTyping.bind( this )
		};

		this.setNormalChatMode();
		this.checkVideoPlayerStatus();

		this.addNodeEvent( 'textarea.inputChatMessage', 'keydown', this.onTyping );
		this.addNodeEvent( 'textarea.inputChatMessage', 'focusin', this.onInputChatFocus );
		this.addNodeEvent( 'textarea.inputChatMessage', 'focusout', this.onInputChatBlur );
		this.addNodeEvent( 'input.sendChatMessage', 'click', this.sendMessage );
		this.addNodeEvent( 'div.toggleUserList', 'click', this.toggleUserList );

		this.recv( 'dispatchedChatMessage', this.receivedDispatchedChatMessage.bind( this ) );
		this.recv( 'newUserLogin', this.newUserLogin.bind( this ) );
		this.recv( 'userLogout', this.userLogout.bind( this ) );
		this.recv( 'userIsTyping', this.userIsTyping.bind( this ) );
		this.recv( 'userConnectionUpdate', this.userConnectionUpdate.bind( this ) );
		this.recv( 'userActionUpdate', this.userActionUpdate.bind( this ) );

		this.on( 'startNewSession.server', this.onNewSession.bind( this ) );
		this.on( 'disconnect.server', this.onDisconnect.bind( this ) );
		this.on( 'userLogout.server', this.onSelfLogout.bind( this ) );

		await this.getInitialChatData({ showMOTD: true });
		this.getPingMessages();

		this.nodes[ 'textarea.inputChatMessage' ].focus();

		return this;
	}

	async destroy() {
		win.clearTimeout( this.timeOffsetTimer );

		for( let [ name, timeoutId ] of Object.entries( this.usersTyping ) ) {
			win.clearTimeout( timeoutId );
		}

		this.usersTyping = null;

		[ style, chatMessageElementStyle, userInListStyle ].forEach( s => s.unuse() );

		super.destroy && super.destroy();
	}

	onDialogModeChange() {
		/* noop */
	}

	onInputChatFocus( event ) {
		event.stopPropagation();
		event.preventDefault();

		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		this.name
			}
		});

		if( isMobileDevice ) {
			doc.body.scrollTop = 160;
		}

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

	onOverlayCloseMax() {
		this.nodes.root.classList.toggle( 'maximized' );
	}

	async checkVideoPlayerStatus() {
		let videoPlayerDialog = await this.fire( 'findModule.VideoPlayerDialog' );

		if( videoPlayerDialog === true ) {
			this.setLiveChatMode();
		}

		this.on( 'moduleLaunch.appEvents', module => {
			if( module.name === 'VideoPlayerDialog' ) {
				this.setLiveChatMode();
			}
		});

		this.on( 'moduleDestruction.appEvents', module => {
			if( module.name === 'VideoPlayerDialog' ) {
				this.removeLiveChatMode();
			}
		});
	}


	async setLiveChatMode() {
		this._liveChatMode = true;

		this.nodes.dialogRoot.style.right		= '';
		this.nodes.dialogRoot.style.left		= '';
		this.nodes.dialogRoot.style.top			= '';
		this.nodes.dialogRoot.style.alignSelf	= '';


		let rect = await this.fire( 'getModuleDimensionsByName.videoPlayerDialog' );

		if( win.innerWidth < 450 ) {
			this.nodes.root.style.height = '42vh';
			this.nodes.dialogRoot.style.top = rect.bottom + 'px';
			this.nodes.dialogRoot.style.left = rect.left + 'px';
			this.nodes.root.style.width = rect.width + 'px';
		} else {
			this.nodes.dialogRoot.classList.add( 'videoPlayerMode' );
			this.nodes.root.style.height = `${ rect.height }px`;

			if(!this.nodes.root.classList.contains( 'compact' ) ) {
				this.toggleUserList();
			}
		}
	}

	async setNormalChatMode() {
		if( isMobileDevice ) {
			this.nodes.dialogRoot.style.top = '2px';
			this.nodes.dialogRoot.style.left = '0px';
		}
	}

	removeLiveChatMode() {
		this._liveChatMode = false;
		this.nodes.dialogRoot.classList.remove( 'videoPlayerMode' );
		this.nodes.root.style.height = '';

		if( this.nodes.root.classList.contains( 'compact' ) ) {
			this.toggleUserList();
		}

		this.centerOverlay();
	}

	toggleUserList() {
		this.nodes.root.classList.toggle( 'compact' );
	}

	async onNewSession( user ) {
		this.log('new session: ', user);

		this.username = user.__username;
		this.nodes[ 'div.username' ].textContent = this.username + ':';

		await this.getInitialChatData({ showMOTD: false });

		this.putLine({
			from:				'Client',
			content:			'Verbindung hergestellt',
			extraClasses:		'serverNotification'
		});
	}

	onDisconnect( reason ) {
		this.putLine({
			from:				'Client',
			content:			`Verbindung unterbrochen: ${ reason }`,
			extraClasses:		'serverNotification'
		});

		this.username = '';
		this.nodes[ 'div.username' ].textContent = '';
		this.nodes[ 'div.userListSection' ].innerHTML = '';
		this.nodes[ 'div.usersOnlineTotalNumber' ].textContent = '';
		this.nodes[ 'div.usersOnlineLoggedInNumber' ].textContent = '';
	}

	onSelfLogout() {
		this.onDisconnect( 'Logout' );
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
					if( this.username !== entry.from && entry.content.indexOf( `@${ this.username }` ) > -1 ) {
						this.putLine( Object.assign( { extraClasses: 'pingMessage' }, entry ) );
					} else {
						this.putLine( entry );
					}
				}
			}

			if( Array.isArray( result.data.loggedInUsers ) ) {
				for( let user of result.data.loggedInUsers ) {
					this.userList.add( user.name, user.action );
				}
			}

			if( showMOTD && typeof result.data.messageOfTheDay === 'string' ) {
				this.putLine({
					from:				'Server',
					content:			result.data.messageOfTheDay,
					extraClasses:		'serverNotification'
				});
			}

			this.nodes[ 'div.username' ].textContent = this.username + ':';
			this.nodes[ 'div.usersOnlineTotalNumber' ].textContent = result.data.totalUsersCount;
			this.nodes[ 'div.usersOnlineLoggedInNumber' ].textContent = result.data.loggedInUsersCount;
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

	async sendMessage() {
		try {
			this.removeNodeEvent( 'textarea.inputChatMessage', 'keydown', this.onTyping );
			this.removeNodeEvent( 'input.sendChatMessage', 'click', this.sendMessage );

			let sendData = this.nodes[ 'textarea.inputChatMessage' ].value;

			if( sendData.trim().length > 256 ) {
				throw new Error( 'Es sind maximal 256 Zeichen pro Nachricht erlaubt.' );
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
		this.userList.removeTyping( data.from );

		if( this.username !== data.from && data.content.indexOf( `@${ this.username }` ) > -1 ) {
			this.putLine( Object.assign( { extraClasses: 'pingMessage' }, data ) );
		} else {
			this.putLine( data );
		}
	}

	async newUserLogin( data ) {
		this.userList.add( data.username, 'Hat sich gerade angemeldet...' );

		this.nodes[ 'div.usersOnlineTotalNumber' ].textContent = data.totalUsersCount;
		this.nodes[ 'div.usersOnlineLoggedInNumber' ].textContent = data.loggedInUsersCount;
	}

	async userConnectionUpdate( data ) {
		this.nodes[ 'div.usersOnlineTotalNumber' ].textContent = data.totalUsersCount;
		this.nodes[ 'div.usersOnlineLoggedInNumber' ].textContent = data.loggedInUsersCount;
	}

	async userActionUpdate( data ) {
		this.userList.update( data );
	}

	async userLogout( data ) {
		this.userList.remove( data.username );

		this.nodes[ 'div.usersOnlineTotalNumber' ].textContent = data.totalUsersCount;
		this.nodes[ 'div.usersOnlineLoggedInNumber' ].textContent = data.loggedInUsersCount;
	}

	async userIsTyping( data ) {
		this.userList.typing( data.username );
	}

	putLine({ from, content, time, type, extraClasses }) {
		let chatMessageElements = this.nodes[ 'div.chatMessages' ].children;

		if( chatMessageElements.length > 50 ) {
			chatMessageElements[ 0 ].remove();
		}

		this.updateTimeOffsets();

		this.render({ htmlData:	chatMessageElementMarkup, standalone: true }).with({
			time:				time,
			timeDiff:			time ? `[Vor ${ getTimePeriod( time ) }]` : '',
			from:				this.paint( from ),
			content:			content,
			extraClasses:		extraClasses || ''
		}).at({
			node:		'div.chatMessages',
			position:	'beforeend'
		});

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

		this.timeOffsetTimer = win.setTimeout( this.updateTimeOffsets.bind( this ), (Math.random()*60) * 1000 );
	}

	addUserToUserList( name, action ) {
		this.removeUserFromUserList( name );

		this.render({ htmlData:	userInListMarkup, standalone: true }).with({
			name:		name,
			status:		action,
			admin:		name === 'DerVeganeGermane' ? 'admin' : ''
		}).at({
			node:		'div.userListSection',
			position:	'beforeend'
		});
	}

	removeUserFromUserList( name ) {
		let match = this.nodes[ 'div.userListSection' ].querySelector( `div.user-${ name }` );

		if( match ) {
			match.remove();
		}
	}

	updateUserFromUserList( updateData ) {
		let match = this.nodes[ 'div.userListSection' ].querySelector( `div.user-${ updateData.from }` );

		if( match ) {
			if( updateData.action ) {
				match.querySelector( 'div.status' ).textContent = updateData.action;
			}
		}
	}

	setUserAsTyping( name ) {
		let match = this.nodes[ 'div.userListSection' ].querySelector( `div.user-${ name } > div.wrapper > div.typingStatus` );

		if( match ) {
			match.classList.add( 'isTyping' );

			this.usersTyping[ name ] = win.setTimeout(() => {
				this.removeAsTyping( name );
			}, 1000 * 15);
		}
	}

	removeAsTyping( name ) {
		let match = this.nodes[ 'div.userListSection' ].querySelector( `div.user-${ name } > div.wrapper > div.typingStatus` );

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
}
/****************************************** liveChatDialog End ******************************************/

async function start( ...args ) {
	[ style, chatMessageElementStyle, userInListStyle ].forEach( style => style.use() );

	return await new LiveChatDialog( ...args );
}

export { start };
