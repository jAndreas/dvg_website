'use strict';

import { Overlay } from 'barfoos2.0/dialog.js';
import { moduleLocations } from 'barfoos2.0/defs.js';
import { extend, isMobileDevice } from 'barfoos2.0/toolkit.js';

import html from '../markup/main.html';
import style from '../style/main.scss';

/*****************************************************************************************************
 *  Displays a given image url centered and fixed
 *****************************************************************************************************/
class ImageViewerDialog extends Overlay {
	constructor( input = { }, options = { } ) {
		extend( options ).with({
			name:			'ImageViewerDialog',
			location:		input.location || moduleLocations.center,
			tmpl:			html,
			noBlur:			true,
			topMost:		true,
			center:			true,
			fixed:			true
		}).and( input );

		super( options );

		return this.init();
	}

	async init() {
		await super.init();

		this.addNodeEvent( this.nodes.root, 'click', this.destroyInstance  );

		if( isMobileDevice ) {
			this.nodes.dialogRoot.style.top = '0px';
			this.nodes.dialogRoot.style.left = '0px';
		}

		this.nodes.root.style.backgroundImage	= this.url;

		return this;
	}

	async destroy() {
		super.destroy && super.destroy();
		[ style ].forEach( s => s.unuse() );
	}

	destroyInstance() {
		this.destroy();
		return false;
	}
}
/****************************************** imageViewerDialog End ******************************************/

async function start( ...args ) {
	[ style ].forEach( style => style.use() );

	return await new ImageViewerDialog( ...args );
}

export { start };
