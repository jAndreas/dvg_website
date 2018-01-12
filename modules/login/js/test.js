'use strict';

import { Overlay, Dialog, Draggable, GlasEffect } from 'barfoos2.0/dialog.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend, mix } from 'barfoos2.0/toolkit.js';

import htmlx from '../markup/main.htmlx';
import style from '../style/main.scss';

let instance = null;
/*****************************************************************************************************
 *  "description here"
 *****************************************************************************************************/
class Test extends mix( Overlay ).with( Dialog, Draggable, GlasEffect ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			tmpl:			htmlx({})
		}).and( input );

		super( options );

		//this.runtimeDependencies.push();

		return this.init();
	}

	async init() {
		// any component related declarations, bindings, listeners etc. which can get executed immediately, before we wait for possible dependencies

		await super.init();

		this.nodes[ 'div.login' ].textContent = 'TEST MODULE';

		// any component related stuff which should wait on dependencies resolve before executing (waitForDOM at least or additional async data)
		return this;
	}

	onDialogModeChange( active ) {
	}
}
/****************************************** Login End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	instance = await new Test( ...args );
}

function stop() {
	if( instance ) {
		instance.destroy();
	}
}

export { start, stop };