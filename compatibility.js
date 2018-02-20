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

			class base {
				constructor() {

				}
			}

			class foo extends mixin( base ) {

			}

			let proxy = new Proxy({}, {
				get: (t,p) => {
					return t[p]
				}
			});
		}

		prop() {
			super.prop && super.prop();
		}
	}

	new CompatibilityCheck();`);

	window['console'].info( 'This Browser is a killer! :-)' );
	import( /* webpackChunkName: DVGWebsite */ './app.js' );
} catch( ex ) {
	window['console'].info( 'It seems like this browser is unable to deal with our requirements, redirecting to ES5-based version...' );
	location.href = 'http://legacy.der-vegane-germane.de';
}
