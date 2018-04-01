'use strict';

import { Component } from 'barfoos2.0/core.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend } from 'barfoos2.0/toolkit.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  Impressum, 'nuff said
 *****************************************************************************************************/
class impressumSection extends Component {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			location:		moduleLocations.center,
			tmpl:			html
		}).and( input );

		super( options );

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

	async inViewport() {
		super.inViewport && super.inViewport( ...arguments );

		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		this.id,
				ref:		this.id
			}
		});
	}

	async offViewport() {
		super.offViewport && super.offViewport( ...arguments );
	}
}
/****************************************** impressumSection End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	return await new impressumSection( ...args );
}

export { start };
