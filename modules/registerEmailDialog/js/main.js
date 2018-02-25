'use strict';

import { Overlay, GlasEffect } from 'barfoos2.0/dialog.js';
import { extend, mix } from 'barfoos2.0/toolkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

let instance		= null;

/*****************************************************************************************************
 *  registerEmailDialog is a dialog which allows the user to enter his/her email-address which then
 *	gets transfered to the backend
 *****************************************************************************************************/
class registerEmailDialog extends mix( Overlay ).with( GlasEffect, ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend(	options	).with({
			tmpl:			html,
			center:			true
		}).and( input );

		super( options );

		return this.init();
	}

	async init() {
		await super.init();

		this.addNodeEvent( 'input.emailAddress', 'keyup', this.onInputKeyUp );
		this.addNodeEvent( 'input.sendEmailAddress', 'click', this.onSubscribeClick );
		this.onInputKeyUp();

		this.nodes[ 'input.emailAddress' ].focus();

		return this;
	}

	onDialogModeChange( /* active */ ) {
	}

	async onSubscribeClick() {
		let {
			'input.emailAddress':emailAddress,
			'span.subscribingInfo':infoText,
			'input.okClose':closeBtn,
			'section.page1':page1,
			'section.page2':page2 } = this.nodes;

		let modal = this.createModalOverlay({
			at:		this.dialogElements[ 'div.bfContentDialogBody' ],
			opts:	{
				spinner: true
			}
		});

		emailAddress.blur();

		try {
			let response = await this.send({
				type:		'registerEmailAddress',
				payload:	{
					newAddress:	emailAddress.value,
					origin:		location.origin
				}
			});

			infoText.innerHTML = response.msg;
			modal.spinner.fulfill();
		} catch( ex ) {
			modal.spinner.cleanup();
			infoText.innerHTML = ex;
			closeBtn.value = 'Alles klar!';
		}

		this.addNodeEventOnce( closeBtn, 'click', () => {
			this.destroy();
			return false;
		});

		page1.style.display = 'none';

		await modal.fulfill();
		page2.style.display = 'flex';
	}

	onInputKeyUp( event ) {
		let {
			'input.emailAddress':emailAddress,
			'input.sendEmailAddress':sendEmailAddress,
			'sup.statusUpdate':status } = this.nodes;

		if( emailAddress.checkValidity() ) {
			if( event.which === 13 ) {
				this.removeNodeEvent( 'input.emailAddress', 'keyup', this.onInputKeyUp );
				this.removeNodeEvent( 'input.sendEmailAddress', 'click', this.onSubscribeClick );
				this.onSubscribeClick();
			} else {
				sendEmailAddress.removeAttribute( 'disabled' );
				status.textContent = '';
			}
		} else {
			sendEmailAddress.setAttribute( 'disabled', 'disabled' );
			status.textContent = emailAddress.validationMessage;
		}
	}
}
/****************************************** registerEmailDialog End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	instance = await new registerEmailDialog( ...args );
}

function stop() {
	[ style ].forEach( style => style.unuse() );

	if( instance ) {
		instance.destroy();
	}
}

export { start, stop };
