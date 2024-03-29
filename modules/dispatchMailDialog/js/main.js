'use strict';

import { Overlay, GlasEffect } from 'barfoos2.0/dialog.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend, Mix } from 'barfoos2.0/toolkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  "description here"
 *****************************************************************************************************/
class DispatchMailDialog extends Mix( Overlay ).With( GlasEffect, ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:					'DispatchMailDialog',
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

		this.addNodeEvent( 'form.emailData', 'submit', this.sendMail );
		this.on( 'sessionLogin.appEvents', this.sessionLogin, this );

		this.fire( 'checkSession.appEvents' );

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
	}

	async sessionLogin( user ) {
		if( user ) {
			this.fire( 'startNewSession.server', user );
		}
	}

	async sendMail( event ) {
		event.preventDefault();
		event.stopPropagation();

		let mailSubject		= this.nodes[ 'input.mailSubject' ].value,
			mailBody		= this.nodes[ 'textarea.mailBody' ].value,
			receivers		= this.nodes[ 'select.receiverList' ].value;

		let res = await this.send({
			type:		'dispatchMail',
			payload:	{ mailSubject, mailBody, receivers }
		},{
			noTimeout:	true
		});

		this.createModalOverlay();

		switch( res.status ) {
			case 'adminPrivilegesRequired':
				await this.modalOverlay.log( 'Admin Login required.' );
				break;
			case 'ok':
				await this.modalOverlay.log( 'Mail dispatching complete.' );
				break;
		}

		this.modalOverlay.fulfill();
	}
}
/****************************************** dispatchMailDialog End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	return await new DispatchMailDialog( ...args );
}

export { start };
