const	webpack			= require( 'webpack' ),
		path			= require( 'path' ),
		fs				= require( 'fs' ),
		{ execSync }	= require( 'child_process' ),
		websiteName		= 'legacy.der-vegane-germane.de',
		websitePath		= `/var/www/html/${websiteName}/`;

console.log( `\nRemoving old files in target ${websitePath}:\n` );
fs.readdirSync( websitePath ).forEach( file  => {
	if( /\.js$|\.map$/.test( file ) ) {
		console.log( 'removing ', file );
		fs.unlink( websitePath + file, () => {} );
	}
});
console.log( '\nDone.\n' );

console.log( `\nCopying ${__dirname}/index.html to ${websitePath}...` );
fs.createReadStream( `${__dirname}/index.html` ).pipe( fs.createWriteStream( `${websitePath}index.html` ) );
console.log( 'Done.\n' );

console.log( '\nCompiling BarFoos 2.0 Framework...\n' );
execSync( 'buildbf -l' );
console.log( 'Done.\n' );

module.exports = {
	context:	__dirname,
	entry:		[ 'babel-polyfill', './app.js' ],
	output:		{
		path:		websitePath,
		filename:	'[name]-bundle.js'
	},
	resolve:	{
		modules:	[
			path.resolve( './node_modules/' ),
			path.resolve( './lib/' ),
			path.resolve( './modules/' )
		]
	},
	devtool:	'source-map',
	module:	{
		rules: [
			{
				test:		/\.js$/,
				enforce:	'pre',
				exclude:	/node_modules/,
				use: [
					{ loader:		'eslint-loader' }
				]
			},
			{
				test:		/\.js$/,
				exclude:	/node_modules/,
				use: [
					{ loader:		'babel-loader' }
				]
			},
			{
				test:		/\.css$/,
				use: [
					{ loader:		'style-loader/useable' },
					{ loader:		'css-loader' }
				]
			},
			{
				test:		/\.scss$/,
				use: [
					{ loader:		'style-loader/useable' },
					{ loader:		'css-loader' },
					{ loader:		'sass-loader' }
				]
			},
			{
				test:		/\.html$/,
				use: [
					{ loader:		'raw-loader' }
				]
			},
			{
				test:		/\.jpg$|.png$/,
				use: [
					{
						loader:		'url-loader',
						options:	{
							limit:	8192
						}
					}
				]
			}
		]
	},
	plugins:	[
		new webpack.DefinePlugin({
			ENV_PROD: true,
			ENV_LEGACY: true
		})
	]
};
