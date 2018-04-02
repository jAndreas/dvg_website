'use strict';

import { Component } from 'barfoos2.0/core.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend } from 'barfoos2.0/toolkit.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  articleSection is the host of articles
 *****************************************************************************************************/
class articleSection extends Component {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:			'articleSection',
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
		await super.init();

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
	}

	async inViewport() {
		super.inViewport && super.inViewport( ...arguments );

		this.fire( 'aboutMeSection.launchModule' );
		this.fire( 'updateHash.appEvents', {
			data:	{
				action:		this.name,
				ref:		this.name
			}
		});
	}

	async offViewport() {
		super.offViewport && super.offViewport( ...arguments );
	}
}
/****************************************** articleSection End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	return await new articleSection( ...args );
}

export { start };
