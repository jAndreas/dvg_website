'use strict';

import { Overlay, GlasEffect } from 'barfoos2.0/dialog.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend, mix } from 'barfoos2.0/toolkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  confirmSubscriptionDialog tries to verify a passed secret-key which gets assigned to an
*	user account on subscription on main site.
 *****************************************************************************************************/
class confirmSubscriptionDialog extends mix( Overlay ).with( GlasEffect, ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:					'confirmSubscriptionDialog',
			location:				moduleLocations.center,
			tmpl:					html,
			center:					true,
			avoidOutsideClickClose:	true
		}).and( input );

		super( options );

		//this.runtimeDependencies.push(

		//);

		return this.init();
	}

	async init() {
		await super.init();

		await this.fire( 'waitForConnection.server' );

		if( this.secretKey ) {
			try {
				this.createModalOverlay({
					opts:	{
						spinner: true
					}
				});

				let response = await this.send({
					type:		'confirmAccountSecretKey',
					payload:	{
						secretKey:		this.secretKey,
						confirmUser:	this.confirmUser
					}
				}, {
					noTimeout: true
				});

				this.modalOverlay.fulfill();

				this.nodes[ 'div.responseMsg' ].innerHTML = response.msg;
			} catch( ex ) {
				this.nodes[ 'div.responseMsg' ].innerHTML = ex;

				this.modalOverlay && this.modalOverlay.fulfill();
			}
		}

		return this;
	}
}
/****************************************** confirmSubscriptionDialog End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	return await new confirmSubscriptionDialog( ...args );
}

export { start };
