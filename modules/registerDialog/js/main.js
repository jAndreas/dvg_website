'use strict';

import { Overlay, GlasEffect } from 'barfoos2.0/dialog.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend, mix } from 'barfoos2.0/toolkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  "description here"
 *****************************************************************************************************/
class registerDialog extends mix( Overlay ).with( GlasEffect, ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:			'registerDialog',
			location:		moduleLocations.center,
			tmpl:			html
		}).and( input );

		super( options );

		return this.init();
	}

	async init() {
		await super.init();

		this.addNodeEvent( 'input.repeatPassword input.password', 'input', this.checkEquality );
		this.addNodeEvent( 'form.registerData', 'submit', this.onSubmit );

		this.recv( 'accountConfirmation', this.onAccountConfirmation.bind( this ) );

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
	}

	checkEquality() {
		if( this.nodes[ 'input.password' ].value !== this.nodes[ 'input.repeatPassword' ].value ) {
			this.nodes[ 'input.repeatPassword' ].setCustomValidity( 'Das Passwort stimmt nicht überein!' );
		} else {
			this.nodes[ 'input.repeatPassword' ].setCustomValidity( '' );
		}

		if( this.nodes[ 'input.password' ].value.length < 6 ) {
			this.nodes[ 'input.password' ].setCustomValidity( 'Das Passwort muss mindestens 6 Zeichen lang sein.' );
		} else {
			this.nodes[ 'input.password' ].setCustomValidity( '' );
		}
	}

	async onSubmit( event ) {
		event.preventDefault();
		event.stopPropagation();

		this.removeNodeEvent( 'form.registerData', 'submit', this.onSubmit );

		let {
			'input.nickname':nickname,
			'input.emailAddress':emailAddress,
			'input.password':password,
			'input.repeatPassword':repeatPassword,
			'span.registerInfo':infoText,
			'input.okClose':closeBtn,
			'section.page1':page1,
			'section.page2':page2 } = this.nodes;

		this.createModalOverlay({
			at:		page1,
			opts:	{
				spinner: true
			}
		});

		[ nickname, emailAddress, password, repeatPassword ].forEach( input => input.blur() );

		try {
			let response = await this.send({
				type:		'registerData',
				payload:	{
					nickname:		nickname.value,
					emailAddress:	emailAddress.value,
					pass:			password.value
				}
			});

			if( response.code === 0xb2 || response.code === 0xb3  ) {
				if( response.code === 0xb2 ) {
					nickname.focus();
					nickname.select();
				}

				if( response.code === 0xb3 ) {
					emailAddress.focus();
					emailAddress.select();
				}

				this.modalOverlay.spinner.cleanup( 400 );
				await this.modalOverlay.log( response.msg, 4000 );
				await this.modalOverlay.fulfill();
				this.addNodeEvent( 'form.registerData', 'submit', this.onSubmit );
			} else {
				this.modalOverlay.fulfill();
				infoText.innerHTML = response.msg;

				this.addNodeEventOnce( closeBtn, 'click', () => {
					this.destroy();
					return false;
				});

				page1.style.display = 'none';
				page2.style.display = 'flex';
			}
		} catch( ex ) {
			await this.modalOverlay.log( ex, 4000 );
			await this.modalOverlay.fulfill();
			this.addNodeEvent( 'form.registerData', 'submit', this.onSubmit );
		}
	}

	onAccountConfirmation( data ) {
		if( this.nodes[ 'input.nickname' ].value === data.user ) {
			this.nodes[ 'span.registerInfo' ].innerHTML = `Alles klar ${ data.user }, ab jetzt kannst Du hier chatten und kommentieren!`;
		}
	}
}
/****************************************** registerDialog End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	return await new registerDialog( ...args );
}

export { start };
