'use strict';

import { Overlay, Dialog, Draggable } from 'barfoos2.0/dialog.js';
import { moduleLocations, VK } from 'barfoos2.0/defs.js';
import { extend, mix, intToRGB, hashCode, getTimePeriod } from 'barfoos2.0/toolkit.js';
import { win } from 'barfoos2.0/domkit.js';
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
class liveChatDialog extends mix( Overlay ).with( Draggable, ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			location:				moduleLocations.center,
			tmpl:					html,
			title:					'Live Chat',
			topMost:				true,
			fixed:					true,
			avoidOutsideClickClose:	true,
			hoverOverlay:			true
		}).and( input );

		super( options );

		return this.init();
	}

	async init() {
		await super.init();

		this.checkVideoPlayerStatus();

		this.addNodeEvent( 'textarea.inputChatMessage', 'keydown', this.onTyping );
		this.addNodeEvent( 'textarea.inputChatMessage', 'focusin', this.onInputChatFocus );
		this.addNodeEvent( 'textarea.inputChatMessage', 'focusout', this.onInputChatBlur );
		this.addNodeEvent( 'input.sendChatMessage', 'click', this.sendMessage );
		this.addNodeEvent( 'div.toggleUserList', 'click', this.toggleUserList );

		this.recv( 'dispatchedChatMessage', this.receivedDispatchedChatMessage.bind( this ) );
		this.recv( 'newUserLogin', this.newUserLogin.bind( this ) );
		this.recv( 'userLogout', this.userLogout.bind( this ) );
		this.recv( 'userConnectionUpdate', this.userConnectionUpdate.bind( this ) );
		this.recv( 'userActionUpdate', this.userActionUpdate.bind( this ) );

		this.on( 'startNewSession.server', this.onNewSession.bind( this ) );
		this.on( 'disconnect.server', this.onDisconnect.bind( this ) );
		this.on( 'userLogout.server', this.onSelfLogout.bind( this ) );

		this.getInitialChatData();

		this.userList	= {
			add:		this.addUserToUserList.bind( this ),
			remove:		this.removeUserFromUserList.bind( this ),
			update:		this.updateUserFromUserList.bind( this )
		};

		return this;
	}

	async destroy() {
		win.clearTimeout( this.timeOffsetTimer );
		[ style, chatMessageElementStyle, userInListStyle ].forEach( s => s.unuse() );

		super.destroy && super.destroy();
	}

	onDialogModeChange() {
		/* noop */
	}

	onInputChatFocus() {
		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		this.id
			}
		});
	}

	onInputChatBlur() {
		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		'',
			}
		});
	}

	onTyping( event ) {
		if( event.which === VK.RETURN && !event.shiftKey ) {
			event.preventDefault();
			event.stopPropagation();
			this.sendMessage();
		}
	}

	async checkVideoPlayerStatus() {
		let videoPlayerDialog = await this.fire( 'getModuleState.core', 'videoPlayerDialog' );

		if( videoPlayerDialog ) {
			this.setLiveChatMode();
		}

		this.on( 'moduleLaunch.appEvents', module => {
			if( module.id === 'videoPlayerDialog' ) {
				this.setLiveChatMode();
			}
		});

		this.on( 'moduleDestruction.appEvents', module => {
			if( module.id === 'videoPlayerDialog' ) {
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


		let rect = await this.fire( `getModuleDimensions.videoPlayerDialog` );

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

		await this.getInitialChatData();

		this.putLine({
			from:				'Client',
			content:			`Verbindung hergestellt`,
			serverNotification:	true
		});
	}

	onDisconnect( reason ) {
		this.putLine({
			from:				'Client',
			content:			`Verbindung unterbrochen: ${ reason }`,
			serverNotification:	true
		});

		this.username = '';
		this.nodes[ 'div.username' ].textContent = '';
		this.nodes[ 'div.userListSection' ].innerHTML = '';
		this.nodes[ 'div.usersOnlineTotalNumber' ].textContent = '';
		this.nodes[ 'div.usersOnlineLoggedInNumber' ].textContent = '';
	}

	onSelfLogout( session ) {
		this.onDisconnect( 'Logout' );
	}

	async getInitialChatData() {
		try {
			let result = await this.send({
				type:		'getInitialChatData'
			});

			this.nodes[ 'div.chatMessages' ].innerHTML = '';

			if( Array.isArray( result.data.history ) ) {
				for( let entry of result.data.history ) {
					this.putLine( entry );
				}
			}

			if( Array.isArray( result.data.loggedInUsers ) ) {
				for( let user of result.data.loggedInUsers ) {
					this.userList.add( user.name, user.action );
				}
			}

			this.username = result.data.username || 'anonym';

			this.nodes[ 'div.username' ].textContent = this.username + ':';
			this.nodes[ 'div.usersOnlineTotalNumber' ].textContent = result.data.totalUsersCount;
			this.nodes[ 'div.usersOnlineLoggedInNumber' ].textContent = result.data.loggedInUsersCount;
		} catch( ex ) {
			this.putLine({
				from:				'Server',
				content:			ex.message,
				serverNotification:	true
			});
		}
	}

	async sendMessage() {
		try {
			let sendData = this.nodes[ 'textarea.inputChatMessage' ].value;

			if( sendData.trim().length > 128 ) {
				throw new Error( 'Es sind maximal 128 Zeichen pro Nachricht erlaubt.' );
			}

			if( sendData.trim().length ) {
				let result = await this.send({
					type:		'chatMessage',
					payload:	{
						message:	sendData
					}
				});

				this.nodes[ 'textarea.inputChatMessage' ].value = '';
			} else {
				throw new Error( 'Du hast wohl nicht viel zu sagen...?' );
			}
		} catch( ex ) {
			this.putLine({
				from:				'Server',
				content:			ex.message,
				serverNotification:	true
			});
		}
	}

	async receivedDispatchedChatMessage( data ) {
		this.putLine( data );
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

	putLine({ from, content, time, type, serverNotification }) {
		let chatMessageElements = this.nodes[ 'div.chatMessages' ].children;

		if( chatMessageElements.length > 50 ) {
			chatMessageElements[ 0 ].remove();
		}

		this.updateTimeOffsets();

		let nodeHash = this.render({ htmlData:	chatMessageElementMarkup, standalone: true }).with({
			time:				time,
			timeDiff:			time ? `[Vor ${ getTimePeriod( time ) }]` : '',
			from:				this.paint( from + ': ' ),
			content:			content,
			extraClasses:		serverNotification ? 'serverNotification' : ''
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

		let nodeHash = this.render({ htmlData:	userInListMarkup, standalone: true }).with({
			name:		name,
			status:		action
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

	paint( input ) {
		let hashColor = intToRGB( hashCode( input ) );
		return `<div class="chatUserNamePainted" title="${ input }" style="color: #${ hashColor }">${ input }</div>`;
	}

	scrollToEnd() {
		this.nodes[ 'div.chatMessages' ].scrollTop = this.nodes[ 'div.chatMessages' ].scrollHeight;
	}
}
/****************************************** liveChatDialog End ******************************************/

async function start( ...args ) {
	[ style, chatMessageElementStyle, userInListStyle ].forEach( style => style.use() );

	return await new liveChatDialog( ...args );
}

export { start };
