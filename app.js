'use strict';

import * as topSection from 'topsection/js/main.js';
import { Composition } from 'barfoos2.0/toolkit.js';
import Mediator from 'barfoos2.0/mediator.js';
import LogTools from 'barfoos2.0/logtools.js';
import BrowserKit from 'barfoos2.0/browserkit.js';

const	Browser		= new BrowserKit(),
		bgImagePath	= '/images/background.jpg';

class DVGWebsite extends Composition( Mediator, LogTools ) {
	constructor() {
		super( ...arguments );
		this.init();
	}

	async init() {
		this.on( 'waitForBackgroundImageLoaded.appEvents', this.waitForBackgroundImageLoaded, this );

		console.time('bgImage');
		this.backgroundImage	= Browser.loadImage( bgImagePath );
		let objURL				= await this.backgroundImage;
		console.timeEnd('bgImage');
		this.fire( 'configApp.core', {
			name:				'Der Vegane Germane - Website',
			title:				'Der Vegane Germane',
			version:			'0.0.6',
			status:				'alpha',
			background:			{
				objURL:					objURL,
				css:		{
				}
			}
		});

		topSection.start();
	}

	waitForBackgroundImageLoaded() {
		this.log('waitForBackgroundImageLoaded was called, returning: ', this.backgroundImage);
		return this.backgroundImage;
	}
}

new DVGWebsite();
