'use strict';

import { Overlay, GlasEffect } from 'barfoos2.0/dialog.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend, Mix } from 'barfoos2.0/toolkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  confirmSubscriptionDialog tries to verify a passed secret-key which gets assigned to an
*	user account on subscription on main site.
 *****************************************************************************************************/
class ConfirmSubscriptionDialog extends Mix( Overlay ).With( GlasEffect, ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:					'ConfirmSubscriptionDialog',
			location:				moduleLocations.center,
			tmpl:					html,
			center:					true,
			fixed:					true,
			standAlone:				true,
			avoidOutsideClickClose:	true
		}).and( input );

		super( options );

		this.runtimeDependencies.push(
			this.fire( 'waitForConnection.server' )
		);

		return this.init();
	}

	async init() {
		await super.init();

		if( this.secretKey ) {
			try {
				let response = Object.create( null );

				this.createModalOverlay({
					opts:	{
						spinner: true
					}
				});

				if( this.confirmReset ) {
					response = await this.send({
						type:		'confirmReset',
						payload:	{
							secretKey:		this.secretKey,
							mode:			'user'
						}
					}, {
						noTimeout: true
					});
				} else if( this.confirmTermination ) {
					this.addNodeEventOnce( 'input.confirmTermination', 'click', async () => {
						this.nodes[ 'input.confirmTermination' ].style.display = 'none';

						let response = await this.send({
							type:		'confirmReset',
							payload:	{
								secretKey:		this.secretKey,
								mode:			'subscription'
							}
						}, {
							noTimeout: true
						});

						this.nodes[ 'div.responseMsg' ].innerHTML = response.msg || '';
					});

					this.nodes[ 'input.confirmTermination' ].style.display = 'block';
				} else {
					response = await this.send({
						type:		'confirmAccountSecretKey',
						payload:	{
							secretKey:		this.secretKey,
							confirmUser:	this.confirmUser
						}
					}, {
						noTimeout: true
					});
				}

				this.modalOverlay && this.modalOverlay.fulfill();

				this.nodes[ 'div.responseMsg' ].innerHTML = response.msg || '';
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

	return await new ConfirmSubscriptionDialog( ...args );
}

export { start };
