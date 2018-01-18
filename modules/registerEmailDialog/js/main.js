'use strict';

import { Overlay, Dialog, Draggable, GlasEffect } from 'barfoos2.0/dialog.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend, mix } from 'barfoos2.0/toolkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import htmlx from '../markup/main.htmlx';
import style from '../style/main.scss';

let instance		= null;

/*****************************************************************************************************
 *  registerEmailDialog is a dialog which allows the user to enter his/her email-address which then
 *	gets transfered to the backend
 *****************************************************************************************************/
class registerEmailDialog extends mix( Overlay ).with( GlasEffect, ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			tmpl:			htmlx({}),
			center:			true
		}).and( input );

		super( options );

		//this.runtimeDependencies.push();

		return this.init();
	}

	async init() {
		await super.init();

		this.addNodeEvent( 'input.emailAddress', 'keyup', this.onInputKeyUp );
		this.addNodeEvent( 'input.sendEmailAddress', 'click', this.onSubscribeClick );
		this.onInputKeyUp();

		return this;
	}

	onDialogModeChange( active ) {
	}

	onSubscribeClick( event ) {
		let {
			'input.emailAddress':emailAddress,
			'input.sendEmailAddress':sendEmailAddress,
			'sup.statusUpdate':status } = this.nodes;

		this.createModalOverlay( this.nodes.dialogRoot );
	}

	onInputKeyUp( event ) {
		let {
			'input.emailAddress':emailAddress,
			'input.sendEmailAddress':sendEmailAddress,
			'sup.statusUpdate':status } = this.nodes;

		if( emailAddress.checkValidity() ) {
			sendEmailAddress.removeAttribute( 'disabled' );
			status.textContent = '';
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
