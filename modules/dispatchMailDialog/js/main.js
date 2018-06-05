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
class dispatchMailDialog extends mix( Overlay ).with( GlasEffect, ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:					'dispatchMailDialog',
			location:				moduleLocations.center,
			tmpl:					html,
			center:					true,
			avoidOutsideClickClose:	true
		}).and( input );

		super( options );

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
			mailBody		= this.nodes[ 'textarea.mailBody' ].value;

		let res = await this.send({
			type:		'dispatchMail',
			payload:	{ mailSubject, mailBody }
		},{
			noTimeout:	true
		});

		switch( res.status ) {
			case 'adminPrivilegesRequired':
				alert( 'Admin Login required.' );
				break;
			case 'ok':
				alert( 'Mail dispatching complete.' );
				break;
		}
	}
}
/****************************************** dispatchMailDialog End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	return await new dispatchMailDialog( ...args );
}

export { start };
