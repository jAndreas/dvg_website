'use strict';

import { Component } from 'barfoos2.0/core.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend } from 'barfoos2.0/toolkit.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  Cookie Disclaimer
 *****************************************************************************************************/
class CookieConfirmSection extends Component {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:			'CookieConfirmSection',
			location:		moduleLocations.footer,
			tmpl:			html
		}).and( input );

		super( options );

		return this.init();
	}

	async init() {
		await super.init();

		this.addNodeEvent( 'input.confirm', 'click', this.confirmClick );

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
	}

	confirmClick() {
		localStorage.setItem( 'allowCookies', 'allow' );
		this.destroy();
		return false;
	}
}
/****************************************** cookieConfirmSection End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	return await new CookieConfirmSection( ...args );
}

export { start };
