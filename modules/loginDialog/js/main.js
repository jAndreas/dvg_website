'use strict';

import { Overlay } from 'barfoos2.0/dialog.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend, mix } from 'barfoos2.0/toolkit.js';
import { win } from 'barfoos2.0/domkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  Logs in a user and dispatches session data
 *****************************************************************************************************/
class loginDialog extends mix( Overlay ).with( ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:			'loginDialog',
			location:		moduleLocations.center,
			tmpl:			html,
			fixed:			true,
			topMost:		true
		}).and( input );

		super( options );

		return this.init();
	}

	async init() {
		await super.init();

		this.addNodeEvent( 'form.loginData', 'submit', this.onSubmit );
		this.addNodeEvent( 'div.forgotPassword', 'click', this.onForgotPassword );

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
	}

	async onSubmit( event ) {
		event.preventDefault();
		event.stopPropagation();

		this.removeNodeEvent( 'form.loginData', 'submit', this.onSubmit );

		let {
			'input.emailAddress':emailAddress,
			'input.password':password,
			'section.page1':page1 } = this.nodes;

		this.createModalOverlay({
			at:		page1,
			opts:	{
				spinner: true
			}
		});

		[ emailAddress, password ].forEach( input => input.blur() );

		try {
			let response = await this.send({
				type:		'loginUser',
				payload:	{
					username:		emailAddress.value,
					pass:			password.value
				}
			});

			this.fire( 'userLogin.server', response.data );

			this.modalOverlay.spinner.cleanup( 400 );
			await this.modalOverlay.log( response.msg, 2000 );
			this.modalOverlay.cleanup();
			this.destroy();
		} catch( ex ) {
			this.modalOverlay.spinner.cleanup( 400 );
			await this.modalOverlay.log( ex.message, 4000 );
			await this.modalOverlay.fulfill();
			this.addNodeEvent( 'form.loginData', 'submit', this.onSubmit );
		}
	}

	async onForgotPassword( event ) {
		event.preventDefault();
		event.stopPropagation();

		this.removeNodeEvent( 'div.forgotPassword', 'click', this.onForgotPassword );

		let {
			'input.emailAddress':email,
			'section.page1':page1 } = this.nodes;

		if( email.value.length === 0 ) {
			email.setCustomValidity( 'E-Mail Adresse erforderlich...' );
			this.nodes[ 'input.login' ].click();

			win.setTimeout(() => {
				email.setCustomValidity( '' );
				this.addNodeEvent( 'div.forgotPassword', 'click', this.onForgotPassword );
			}, 3000);
		} else {
			try {
				this.createModalOverlay({
					at:		page1,
					opts:	{
						spinner: true
					}
				});

				let response = await this.send({
					type:		'resetPassword',
					payload:	{
						email:	email.value,
					}
				});

				this.modalOverlay.spinner.cleanup( 400 );
				await this.modalOverlay.log( response.msg, 6000 );
				await this.modalOverlay.fulfill();
			} catch( ex ) {
				this.modalOverlay.spinner.cleanup( 400 );
				await this.modalOverlay.log( ex.message, 4000 );
				await this.modalOverlay.fulfill();
			}
		}
	}
}
/****************************************** loginDialog End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	return await new loginDialog( ...args );
}

export { start };
