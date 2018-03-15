'use strict';

import { Component } from 'barfoos2.0/core.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend } from 'barfoos2.0/toolkit.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  "description here"
 *****************************************************************************************************/
class aboutMeSection extends Component {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			location:		moduleLocations.center,
			tmpl:			html
		}).and( input );

		super( options );

		/*this.runtimeDependencies.push(
			this.fire( 'SomeEvent.appEvents' ) // or any promise
		);*/

		return this.init();
	}

	async init() {
		// any component related declarations, bindings, listeners etc. which can get executed immediately, before we wait for possible dependencies

		await super.init();

		// any component related stuff which should wait on dependencies resolve before executing (waitForDOM at least or additional async data)

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
	}
}
/****************************************** aboutMeSection End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	return await new aboutMeSection( ...args );
}

export { start };
