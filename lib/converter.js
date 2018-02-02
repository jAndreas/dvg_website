'use strict';

import { spawn } from 'child_process';
import { extend } from 'barfoos2.0/toolkit';

class Converter {
	constructor( input = { } ) {
		if( typeof input.file !== 'string' ) {
			throw new Error( 'Missing or wrong file argument.' );
		}

		if( typeof input.outputPath !== 'string' ) {
			throw new Error( 'Missing or wrong outputPath argument.' );
		}

		if( input.outputPath[ input.outputPath.length -1 ] !== '/' ) {
			input.outputPath += '/';
		}

		let fileName	= input.file.slice( Math.abs( ~input.file.lastIndexOf( '/' ) ), input.file.lastIndexOf( '.' ) ),
			fileExt		= input.file.slice( input.file.lastIndexOf( '.' ) + 1 );

		if(!fileName || !fileExt ) {
			throw new Error( 'Provided filename seems malicious.' );
		}

		input.fileName	= fileName;
		input.fileExt	= fileExt;

		extend( this ).with({
			qualities:	[
				{ resolution: '1920:1080', crf: 24 },
				{ resolution: '1280:720', crf: 24 },
				{ resolution: '854:480', crf: 24 },
				{ resolution: '640:360', crf: 28 }
			]
		}).and( input );

		let cpuLimitArgs =	[	'-l', this.cpuLimit,
								'-e', 'ffmpeg' ];

		if( this.cpuLimit ) {
			console.log( `Limiting total CPU usage to ${ this.cpuLimit }%` );
			this.cpuLimitProc = spawn( 'cpulimit', cpuLimitArgs );
		}

		process.on('SIGINT', () => {;
			this.terminateCPULimit();
			process.exit();
		});
	}

	terminateCPULimit() {
		if( this.cpuLimit ) {
			console.log('Terminating cpuLimit...');
			this.cpuLimitProc.kill( 'SIGKILL' );
		}
	}

	convert( q ) {
		return new Promise( (res, rej ) => {
			let ffmpegArgs		= [	'-i', this.file,
				 					'-sws_flags', 'lanczos+accurate_rnd',
									'-vf', `scale=${ q.resolution }`,
									'-c:v', 'libx264',
									'-crf', `${ q.crf }`,
									'-preset', 'veryfast',
									'-profile:v', 'main',
									'-tune', 'fastdecode',
									'-c:a', 'copy',
									'-threads', '4',
									`${ this.outputPath }${ this.fileName }_${ q.resolution.split( ':' )[ 1 ] }.${ this.fileExt }` ];

			console.log( 'spawning ffmpeg with args: ', ffmpegArgs.join( ' ' ) );
			let ffmpegProc = spawn( 'ffmpeg', ffmpegArgs );

			ffmpegProc.stderr.on( 'data', err => {
					// TODO: write data to log file...
					//console.log( `ffmpeg error: ${ err }` );
			});

			ffmpegProc.on( 'error', err => {
					// TODO: write error to log file...
					rej( err );
			});

			ffmpegProc.on( 'exit', code => {
					// TODO: write exit code to log file...

					if( code === 0 ) {
						res();
					} else {
						rej( `ffmpeg exited with code: ${ code }` );
					}
			});
		});
	}

	async start() {
		for( let quality of this.qualities ) {
			console.log( `Start converting ${ this.file } to ${ quality.resolution }(${ quality.crf } crf).` );

			try {
				let res = await this.convert( quality );
			} catch ( ex ) {
				console.log( 'Something bad happened while executing ffmpeg, check error.log.' );
				console.log( ex );
				break;
			}

			console.log( `Finished.\n\n` );
		}

		this.terminateCPULimit();
	}
}

let conv = new Converter({
	file:			'/var/www/html/der-vegane-germane.de/video/intro.mp4',
	outputPath:		'/var/www/html/der-vegane-germane.de/video/'
	cpuLimit:		200
}).start();

export { Converter };
