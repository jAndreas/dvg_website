'use strict';

import { Overlay, Dialog, Draggable, GlasEffect } from 'barfoos2.0/dialog.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend, mix } from 'barfoos2.0/toolkit.js';

import htmlx from '../markup/main.htmlx';
import style from '../style/main.scss';

let	instance	= null;

/*****************************************************************************************************
 *  "description here"
 *****************************************************************************************************/
class Login extends mix( Overlay ).with( Dialog, Draggable, GlasEffect ) {
	constructor( input = { }, options = { } ) {
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

		return this;
	}

	onDialogModeChange( active ) {
	}
}
/****************************************** Login End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	instance = await new Login( ...args );
}

function stop() {
	if( instance ) {
		instance.destroy();
	}
}

export { start, stop };
