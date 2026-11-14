<?php
namespace SiteTheme;
defined('ABSPATH') || exit;

require_once __DIR__ . '/breakpoints.php';
require_once __DIR__ . '/frontend.php';
if (!function_exists('add_action')) return;

require_once __DIR__ . '/post-types/site-parts.php';
require_once __DIR__ . '/blocks.php';
require_once __DIR__ . '/svg.php';
require_once __DIR__ . '/post-types/modals.php';
require_once __DIR__ . '/api/modals.php';
require_once __DIR__ . '/integrations.php';
require_once __DIR__ . '/post-types/collections.php';
require_once __DIR__ . '/patterns.php';
require_once __DIR__ . '/editor.php';
require_once __DIR__ . '/documents.php';
require_once __DIR__ . '/rendering/bootstrap.php';
require_once __DIR__ . '/routing/archives.php';
require_once __DIR__ . '/routing/headless.php';
require_once __DIR__ . '/options/archives.php';
require_once __DIR__ . '/api/content.php';
require_once __DIR__ . '/seo.php';
require_once __DIR__ . '/admin/appearance.php';
require_once __DIR__ . '/setup.php';
