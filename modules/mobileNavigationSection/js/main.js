'use strict';

import { Component } from 'barfoos2.0/core.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend } from 'barfoos2.0/toolkit.js';

import html from '../markup/main.html';
import navElementMarkup from '../markup/navElement.html';
import style from '../style/main.scss';
import navElementStyle from '../style/navElement.scss';


/*****************************************************************************************************
 *  mobileNavigationSection handles a vertical navigation section fixed on screen, mostly for
 *	quick navigation on mobile devices respectively devices with a small viewport
 *****************************************************************************************************/
class mobileNavigationSection extends Component {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			location:		moduleLocations.right,
			tmpl:			html
		}).and( input );

		super( options );

		/*this.runtimeDependencies.push(
			this.fire( 'SomeEvent.appEvents' )
		);*/

		return this.init();
	}

	async init() {
		await super.init();

		let navListData = await this.fire( 'getSiteNavigation.appEvents' );

		for( let data of navListData ) {
			this.render({ htmlData:	navElementMarkup }).with( data ).at({
				node:		'root',
				position:	'beforeend'
			});
		}

		this.addNodeEvent( 'root', 'touchstart', this.onNavClick );

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style, navElementStyle ].forEach( s => s.unuse() );
	}

	async onNavClick( event ) {
		if( event.originalTarget ) {
			await this.fire( 'requestMobileNavigation.core' );

			if( this.data.get( event.originalTarget ) ) {
				await this.fire( 'remoteNavigate.appEvents', {
					id:		this.data.get( event.originalTarget ).storage.nodeData.id,
					event:	event
				});
			}
		}
	}
}
/****************************************** mobileNavigationSection End ******************************************/

async function start( ...args ) {
	[ style, navElementStyle ].forEach( style => style.use() );

	return await new mobileNavigationSection( ...args );
}

export { start };
