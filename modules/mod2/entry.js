'use strict';

import { mediator } from 'barfoos2.0/mediator.js';

//import io from 'socket.io-client';
const test = 23;
const m = new mediator({ register: 'GUIModuleMessages' });

m.on( 'whatever', ( ...args ) => {
	console.log('WHATEVER HAPPENED! -> ', args);
	console.log('test with new mediator instance is: ', test);
});

setTimeout(() => {
	console.log( 'mod2.js dispatch whatever: ' );
	m.fire('whatever', 'MEDIATOR INSTANCE!!!');
}, 2200);