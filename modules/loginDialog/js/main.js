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
class loginDialog extends mix( Overlay ).with( GlasEffect, ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			location:		moduleLocations.center,
			tmpl:			html
		}).and( input );

		super( options );

		return this.init();
	}

	async init() {
		await super.init();

		this.addNodeEvent( 'form.loginData', 'submit', this.onSubmit );

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
			'input.login':loginBtn,
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
					emailAddress:	emailAddress.value,
					pass:			password.value
				}
			})

			this.fire( 'userLogin.server', response.data );

			this.modalOverlay.spinner.cleanup( 400 );
			await this.modalOverlay.log( response.msg, 2000 );
			this.modalOverlay.cleanup();
			this.destroy();
		} catch( ex ) {
			this.modalOverlay.spinner.cleanup( 400 );
			await this.modalOverlay.log( ex, 4000 );
			await this.modalOverlay.fulfill();
			this.addNodeEvent( 'form.loginData', 'submit', this.onSubmit );
		}
	}
}
/****************************************** loginDialog End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	return await new loginDialog( ...args );
}

export { start };
