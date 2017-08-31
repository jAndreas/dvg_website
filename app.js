'use strict';

import * as topSection from './modules/topsection/js/main.js';
import { Composition } from 'barfoos2.0/toolkit.js';
import { LogTools } from 'barfoos2.0/domkit.js';
import { Mediator } from 'barfoos2.0/mediator.js';

class DVGWebsite extends Composition( Mediator, LogTools ) {
	constructor() {
		super( ...arguments );
		this.init();
	}

	async init() {
		this.fire( 'configApp.core', {
			name:				'Der Vegane Germane - Website',
			title:				'Der Vegane Germane',
			version:			'0.0.4',
			status:				'alpha',
			background:			{
				image:		'/images/background.jpg',
				css:		{
					filter:		'blur(10px)'
				}
			}
		});

		topSection.start();
	}
}

new DVGWebsite();
