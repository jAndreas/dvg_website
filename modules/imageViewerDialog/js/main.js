'use strict';

import { Overlay, Draggable } from 'barfoos2.0/dialog.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend, mix, isMobileDevice } from 'barfoos2.0/toolkit.js';
import { win } from 'barfoos2.0/domkit.js';
import ServerConnection from 'barfoos2.0/serverconnection.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  Displays a given image url centered and fixed
 *****************************************************************************************************/
class imageViewerDialog extends mix( Overlay ).with( Draggable ) {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:			'imageViewerDialog',
			location:		input.location || moduleLocations.center,
			tmpl:			html,
			noBlur:			true,
			hoverOverlay:	true,
			topMost:		true,
			center:			true,
			fixed:			true
		}).and( input );

		super( options );

		return this.init();
	}

	async init() {
		await super.init();

		this.addNodeEvent( this.nodes.root, 'click', () => this.destroy() );

		if( isMobileDevice ) {
			this.nodes.dialogRoot.style.top = `0px`;
			this.nodes.dialogRoot.style.left = `0px`;
		}

		this.nodes.root.style.backgroundImage	= this.url;

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
	}
}
/****************************************** imageViewerDialog End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	return await new imageViewerDialog( ...args );
}

export { start };
