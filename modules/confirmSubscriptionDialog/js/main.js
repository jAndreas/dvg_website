'use strict';

import { Overlay, GlasEffect } from 'barfoos2.0/dialog.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend, mix } from 'barfoos2.0/toolkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

let		instance		= null;

/*****************************************************************************************************
 *  confirmSubscriptionDialog tries to verify a passed secret-key which gets assigned to an
*	user account on subscription on main site.
 *****************************************************************************************************/
class confirmSubscriptionDialog extends mix( Overlay ).with( GlasEffect, ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			location:				moduleLocations.center,
			tmpl:					html,
			center:					true,
			avoidOutsideClickClose:	true
		}).and( input );

		super( options );

		/*this.runtimeDependencies.push(
			this.fire( 'SomeEvent.appEvents' ) // or any promise
		);*/

		return this.init();
	}

	async init() {
		await super.init();

		if( this.secretKey ) {
			try {
				let response = await this.send({
					type:		'confirmAccountSecretKey',
					payload:	{
						secretKey:	this.secretKey
					}
				});

				this.nodes[ 'div.confirmSubscriptionDialog' ].textContent = response.msg;
			} catch( ex ) {
				this.nodes[ 'div.confirmSubscriptionDialog' ].textContent = ex;
			}
		}

		return this;
	}
}
/****************************************** confirmSubscriptionDialog End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	instance = await new confirmSubscriptionDialog( ...args );
}

function stop() {
	[ style ].forEach( style => style.unuse() );

	if( instance ) {
		instance.destroy();
	}
}

export { start, stop };
