const	webpack			= require( 'webpack' ),
		path			= require( 'path' ),
		fs				= require( 'fs' ),
		{ execSync }	= require( 'child_process' ),
		websiteName		= 'dev.der-vegane-germane.de',
		websitePath		= `/var/www/html/${websiteName}/`;

console.log( `\nRemoving old javascript and mapping files in ${websitePath}...` );
fs.readdirSync( websitePath ).forEach( file  => {
	if( /\.js$|\.map$/.test( file ) ) {
		console.log( `\tremoving ${file}` );
		fs.unlink( websitePath + file, () => {} );
	}
});

console.log( `\nCopying ${__dirname}/index.html to ${websitePath}...` );
fs.createReadStream( `${__dirname}/index.html` ).pipe( fs.createWriteStream( `${websitePath}index.html` ) );
console.log( 'Done.\n' );

console.log( '\nCompiling BarFoos 2.0 Framework...\n' );
execSync( 'buildbf -d' );
console.log( 'Done.\n' );

module.exports = {
	context:	__dirname,
	entry:		[ './app.js' ],
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
		rules:	[
		/*	{
				test:		/\.js$/,
				exclude:	/node_modules/,
				use: [
					{ loader:		'babel-loader' }
				]
			},*/
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
				test:		/\.htmlx$/,
				use: [
					{ loader:		'babel-loader' },
					{ loader:		'template-string-loader' }
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
		new webpack.optimize.ModuleConcatenationPlugin(),
		new webpack.optimize.CommonsChunkPlugin({ name: 'main', children: true, async: true, minChunks: 2 }),
		new webpack.DefinePlugin({
			ENV_PROD: false
		})
	]
};
