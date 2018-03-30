'use strict';

import { Overlay, Dialog, Draggable } from 'barfoos2.0/dialog.js';
import { moduleLocations, VK } from 'barfoos2.0/defs.js';
import { extend, mix, intToRGB, hashCode } from 'barfoos2.0/toolkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import chatMessageElementMarkup from '../markup/chatMessageElement.html';
import style from '../style/main.scss';
import chatMessageElementStyle from '../style/chatMessageElement.scss';


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

		this.addNodeEvent( 'textarea.inputChatMessage', 'keydown', this.onTyping );
		this.addNodeEvent( 'input.sendChatMessage', 'click touchstart', this.sendMessage );

		this.recv( 'dispatchedChatMessage', this.receivedDispatchedChatMessage.bind( this ) );

		this.getInitialChatData();

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style, chatMessageElementStyle ].forEach( s => s.unuse() );
	}

	onTyping( event ) {
		//this.nodes[ 'div.charactersLeft' ].textContent = `${ } Zeichen übrig.`;

		if( event.which === VK.RETURN && !event.shiftKey ) {
			event.preventDefault();
			event.stopPropagation();
			this.sendMessage();
		}
	}

	async getInitialChatData() {
		try {
			let result = await this.send({
				type:		'getInitialChatData'
			});

			if( Array.isArray( result.data.history ) ) {
				for( let entry of result.data.history ) {
					this.putLine( entry.from, entry.content );
				}
			}
		} catch( ex ) {
			this.log( 'getInitialChatData: ', ex.message );
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

				console.log('result: ', result);
				if( result.data.serverMessage ) {
					this.putLine( 'Server', result.data.serverMessage );

				}

				this.nodes[ 'textarea.inputChatMessage' ].value = '';
			} else {
				throw new Error( 'Du hast wohl nicht viel zu sagen...?' );
			}
		} catch( ex ) {
			this.putLine( 'Server', ex.message, true );
		}
	}

	async receivedDispatchedChatMessage( data ) {
		this.putLine( data.from, data.content );
	}

	putLine( from, msg, highlight ) {
		let nodeHash = this.render({ htmlData:	chatMessageElementMarkup, standalone: true }).with({
			from:		this.paint( from + ': ' ),
			content:	msg
		}).at({
			node:		'div.chatMessages',
			position:	'beforeend'
		});

		this.scrollToEnd();
	}

	paint( input ) {
		let hashColor = intToRGB( hashCode( input ) );
		return `<div class="chatUserNamePainted" style="color: #${ hashColor }">${ input }</div>`;
	}

	scrollToEnd() {
		this.nodes[ 'div.chatMessages' ].scrollTop = this.nodes[ 'div.chatMessages' ].scrollHeight;
	}
}
/****************************************** liveChatDialog End ******************************************/

async function start( ...args ) {
	[ style, chatMessageElementStyle ].forEach( style => style.use() );

	return await new liveChatDialog( ...args );
}

export { start };
