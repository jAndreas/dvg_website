'use strict';

import { Overlay, GlasEffect } from 'barfoos2.0/dialog.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend, Mix } from 'barfoos2.0/toolkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  registerEmailDialog is a dialog which allows the user to enter his/her email-address which then
 *	gets transfered to the backend
 *****************************************************************************************************/
class RegisterEmailDialog extends Mix( Overlay ).With( GlasEffect, ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend(	options	).with({
			name:						'RegisterEmailDialog',
			location:					moduleLocations.center,
			tmpl:						html,
			center:						true,
			fixed:						true,
			standAlone:					input.standAlone,
			avoidOutsideClickClose:		!input.location
		}).and( input );

		super( options );

		return this.init();
	}

	async init() {
		await super.init();

		this.addNodeEvent( 'input.emailAddress', 'keyup', this.onInputKeyUp );
		this.addNodeEvent( 'input.sendEmailAddress', 'click', this.onSubscribeClick );
		this.onInputKeyUp();

		this.nodes[ 'input.emailAddress' ].focus({
			preventScroll:	true
		});

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
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

		this.removeNodeEvent( 'input.emailAddress', 'keyup', this.onInputKeyUp );
		this.removeNodeEvent( 'input.sendEmailAddress', 'click', this.onSubscribeClick );

		this.createModalOverlay({
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
					newAddress:		emailAddress.value,
					emailOptions:	{
						recvMailOnVideo:		!!this.nodes[ 'input.optionVideos' ].checked,
						recvMailOnArticle:		!!this.nodes[ 'input.optionArticles' ].checked,
						recvMailOnNews:			!!this.nodes[ 'input.optionNews' ].checked,
						recvMailOnTwitch:		!!this.nodes[ 'input.optionLivestreams' ].checked,
						recvMailOnTwitchGaming:	!!this.nodes[ 'input.optionLivestreamsGaming' ].checked
					},
					origin:			location.origin
				}
			});

			infoText.innerHTML = response.msg;
			this.modalOverlay.spinner.fulfill();
		} catch( ex ) {
			this.modalOverlay.spinner.cleanup();
			infoText.innerHTML = ex;
			closeBtn.value = 'Alles klar!';
		}

		this.addNodeEventOnce( closeBtn, 'click', () => {
			if( this.location === moduleLocations.center ) {
				page2.style.display = 'none';
				page1.style.display = 'flex';

				this.addNodeEvent( 'input.emailAddress', 'keyup', this.onInputKeyUp );
				this.addNodeEvent( 'input.sendEmailAddress', 'click', this.onSubscribeClick );
			} else {
				this.destroy();
			}

			return false;
		});

		page1.style.display = 'none';

		await this.modalOverlay.fulfill();
		page2.style.display = 'flex';
	}

	onInputKeyUp( event ) {
		let {
			'input.emailAddress':emailAddress,
			'input.sendEmailAddress':sendEmailAddress,
			'sup.statusUpdate':status } = this.nodes;

		if( emailAddress.checkValidity() ) {
			if( event.which === 13 ) {
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

	return await new RegisterEmailDialog( ...args );
}

export { start };
