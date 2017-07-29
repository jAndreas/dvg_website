'use strict';

import * as topSection from './modules/topsection/js/main.js';
import { makeClass } from 'barfoos2.0/toolkit.js';
import { LogTools } from 'barfoos2.0/domkit.js';
import { Mediator } from 'barfoos2.0/mediator.js';

const	eventLoop	= makeClass().mixin( Mediator ),
		console		= makeClass( class app{ }, { id: 'app' } ).mixin( LogTools );

eventLoop.fire( 'defineApp.appEvents', {
		name:		'Der Vegane Germane - Website',
		title:		'Der Vegane Germane',
		version:	'0.2.0',
		status:		'alpha'
 });

console.log('starting topSection...: ');
topSection.start();
