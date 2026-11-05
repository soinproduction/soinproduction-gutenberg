<?php
namespace SiteTheme\Kit;
defined('ABSPATH') || exit;
/** One host connection; generated entries belong to components and modules. */
require_once __DIR__.'/adapters/next/runtime.php';
require_once __DIR__.'/admin-ui/bootstrap.php';
foreach (require __DIR__.'/generated/modules.php' as $entry) {
 require_once __DIR__.'/'.$entry;
}
