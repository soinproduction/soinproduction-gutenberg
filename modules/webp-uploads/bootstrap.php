<?php
namespace SpWebpUploads;
defined('ABSPATH') || exit;
require_once __DIR__.'/gutenberg.php';
require_once __DIR__.'/configuration.php';
require_once __DIR__.'/conversion.php';
require_once __DIR__.'/attachments.php';
require_once __DIR__.'/references.php';
require_once __DIR__.'/unused.php';
require_once __DIR__.'/ajax.php';
require_once __DIR__.'/admin.php';
require_once __DIR__.'/class-module.php';
Module::get();
