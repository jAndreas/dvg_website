const	webpack		= require( 'webpack' ),
		path		= require( 'path' ),
		fs			= require( 'fs' ),
		websiteName	= 'der-vegane-germane.de',
		websitePath	= `/var/www/html/${websiteName}/`;

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

module.exports = {
	context:	__dirname,
	entry:		[ './app.js' ],
	output:		{
		path:		websitePath,
		filename:	'[name]-bundle.js'
	},
	//devtool:	'source-map',
	module:	{
		rules:	[
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
		new webpack.optimize.CommonsChunkPlugin({ minChunks: 2, name: 'main', children: true, async: true }),
		new webpack.DefinePlugin({
			ENV_PROD: false,
		})
	]
};
