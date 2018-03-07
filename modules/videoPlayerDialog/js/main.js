'use strict';

import { Overlay, GlasEffect, Draggable } from 'barfoos2.0/dialog.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend, mix } from 'barfoos2.0/toolkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

let		instance		= null;

/*****************************************************************************************************
 *  "description here"
 *****************************************************************************************************/
class videoPlayerDialog extends mix( Overlay ).with( GlasEffect, Draggable, ServerConnection ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			location:			moduleLocations.center,
			tmpl:				html,
			centerToViewport:	true
		}).and( input );

		super( options );

		this.runtimeDependencies.push(
			this.fire( 'waitforHLSSupport.appEvents' )
		);

		return this.init();
	}

	async init() {
		await super.init();


		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
	}
}
/****************************************** videoPlayerDialog End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	instance = await new videoPlayerDialog( ...args );
}

function stop() {
	[ style ].forEach( style => style.unuse() );

	if( instance ) {
		instance.destroy();
	}
}

export { start, stop };
