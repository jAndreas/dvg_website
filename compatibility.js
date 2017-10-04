'use strict';

try {
	eval(`class CompatibilityCheck {
		constructor( opt = {} ) {
			const check2	= true;
			let check1		= true;

			(async function() {
				await new Promise((res, rej) => {
					setTimeout(() => {
						res( 1 );
					}, 1);
				});
			}());

			this.prop();

			Object.entries({ foo: 42, bar: 23 });
			new WeakMap();

			let arr = [3,2,1];
			let [ a, b, c ] = arr;

			let mixin = mix => class extends mix {
				constructor() {

				}
			};
		}

		prop() {
			super.prop && super.prop();
		}
	}

	new CompatibilityCheck();`);
} catch( ex ) {
	console.log( 'It seems like this browser is unable to deal with our tech, redirect to ES5-based version...' );
	location.href = '//legacy.der-vegane-germane.de';
}

console.log( 'This Browser is a killer! :-)' );
import( /* webpackChunkName: DVGWebsite */ './app.js' );
