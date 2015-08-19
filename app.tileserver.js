// Modules
// =======
var express = require( 'express' );
var W = require( 'w-js' );
var gm = require('gm');
var request = require('request');
var path = require( 'path' );
var http = require( 'http' );
var fs = require( 'fs' );

// Make & Init
// ===========

function makeWebApp () {
    return {
        port: process.env.PORT || 15000,
        isLocal: W.isDefined( process.env.IS_LOCAL ) ? Boolean( process.env.IS_LOCAL ) : false
    };
}

var initWebApp = W.composePromisers( makeExpressApp,
                                     makeServer );

initWebApp( makeWebApp() )
    .success( function ( app ) {
        console.log( 'OK', 'Listening on port:', app.port );
    });

// Promisers
// =========

function makeExpressApp ( app ) {
    return W.promise( function ( resolve, reject ) {

        app.expressApp = express();

        // Jade
        // ----
        app.expressApp.set( 'view engine', 'jade' );
        app.expressApp.set( 'views', path.join( __dirname, 'views' ) );
        if ( app.IS_LOCAL ) { app.expressApp.locals.pretty = true; }

        // Middleware
        // ----------
        app.expressApp.get( '/ocm/:z/:x/:y', function ( req, res ) {

            var filenameOCM = [  req.params.z, req.params.x, req.params.y ].join( 'o' ) + '.png';
            var filenameLejog = [  req.params.z, req.params.x, req.params.y ].join( 'j' ) + '.png';

            download( getOCMUrl( req.params.z, req.params.x, req.params.y ), filenameOCM, function () {
                download( getLejogUrl( req.params.z, req.params.x, req.params.y ), filenameLejog, function () {
                    gm()
                        .command("composite") 
                        .in("-gravity", "center")
                        .in( filenameOCM )
                        .in( filenameLejog )
                        .write( filenameOCM + filenameLejog, function ( e ) {
                            if (!e) {
                                fs.createReadStream( filenameOCM + filenameLejog ).pipe( res );
                            } else {
                                res.send( 500 );
                            }
                        });
                });
            });
        });

            
        resolve( app );
    });
}

function makeServer ( app ) {
    return W.promise( function ( resolve, reject ) {
        app.server = http.createServer( app.expressApp );
        app.server.listen( app.port );
        resolve( app );
    });
}


// Utils
// =====

// Tile Sources
// ------------

function getLejogUrl ( z, x, y ) {
    return [ 'https://rossc1.cartodb.com/api/v1/map/b76457e53ca18c161722acddf8970687/', z, '/', x, '/', y, '.png' ].join( '' );
}

function getOCMUrl ( z, x, y ) {
    return [ 'http://', W.randomFrom( [ 'a', 'b', 'c' ] ), '.tile.thunderforest.com/cycle/', z, '/', x, '/', y, '.png' ].join( '' );
}

// Fn
// --

var download = function(uri, filename, callback){
  request.head(uri, function(err, res, body){
    console.log('content-type:', res.headers['content-type']);
    console.log('content-length:', res.headers['content-length']);

      console.log( 'downloading', uri );
      
    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};
