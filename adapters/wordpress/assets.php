<?php
	/** Public compiled assets only; no WordPress bootstrap or source-file access. */
	$asset = ltrim( $_SERVER['PATH_INFO'] ?? '', '/' );
	if ( ! preg_match( '~^(?:runtime\.js|site\.css|chunks/[A-Za-z0-9_-]+\.js|images/[A-Za-z0-9_-]+\.png)$~D', $asset ) ) {
		http_response_code( 404 );
		exit;
	}
	$file = __DIR__ . '/' . $asset;
	if ( ! is_file( $file ) ) {
		http_response_code( 404 );
		exit;
	}
	$gzip = is_file( $file . '.gz' ) && preg_match( '/(?:^|,)\s*gzip\s*(?:;\s*q=(?!0(?:\.0*)?(?:\s*,|$))[^,]+)?(?:,|$)/i', $_SERVER['HTTP_ACCEPT_ENCODING'] ?? '' );
	$etag = '"' . filemtime( $file ) . '-' . filesize( $file ) . ( $gzip ? '-gzip' : '' ) . '"';
	header( 'ETag: ' . $etag );
	header( 'Vary: Accept-Encoding' );
	header( 'Cache-Control: public, max-age=' . ( str_starts_with( $asset, 'chunks/' ) ? '31536000, immutable' : '3600' ) );
	header( 'X-Content-Type-Options: nosniff' );
	if ( ( $_SERVER['HTTP_IF_NONE_MATCH'] ?? '' ) === $etag ) {
		http_response_code( 304 );
		exit;
	}
	header( 'Content-Type: ' . ( str_ends_with( $asset, '.js' ) ? 'application/javascript; charset=UTF-8' : ( str_ends_with( $asset, '.css' ) ? 'text/css; charset=UTF-8' : 'image/png' ) ) );
	if ( $gzip ) {
		header( 'Content-Encoding: gzip' );
		$file .= '.gz';
	}
	header( 'Content-Length: ' . filesize( $file ) );
	if ( ( $_SERVER['REQUEST_METHOD'] ?? 'GET' ) !== 'HEAD' ) {
		readfile( $file );
	}
