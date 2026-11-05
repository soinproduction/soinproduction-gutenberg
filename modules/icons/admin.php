<?php
namespace SpIcons;
defined('ABSPATH') || exit;
add_action('admin_menu',function(){ add_media_page('Icon library','<span style="display:flex;align-items:center;gap:6px"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" aria-hidden="true"><path stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM17 13l4 7h-8z"/></svg>Icons</span>','manage_options','sp-icons',__NAMESPACE__.'\\page'); });
add_action('admin_enqueue_scripts',function($hook){
    if($hook!=='media_page_sp-icons') return;
    wp_enqueue_media();
    $url=apply_filters('sp_icons_assets_url','');
    wp_enqueue_style('sp-icons',$url.'/admin.css',[],filemtime(__DIR__.'/assets/admin.css'));
    wp_enqueue_script('sp-icons',$url.'/admin.js',['media-views'],filemtime(__DIR__.'/assets/admin.js'),true);
    wp_add_inline_script('sp-icons','window.spIconsAdmin='.wp_json_encode(['nonce'=>wp_create_nonce('sp_icons'),'ajax'=>admin_url('admin-ajax.php'),'sets'=>sets()]).';','before');
});
add_action('wp_ajax_sp_icons_save',function(){
    if(!current_user_can('manage_options')) wp_send_json_error(['message'=>'Permission denied.'],403);
    check_ajax_referer('sp_icons','nonce');
    try {
        $mode=sanitize_key($_POST['mode']??'');$slug=sanitize_title(wp_unslash($_POST['slug']??''));
        if($mode==='remove_icon') {
            $all=sets();$key=sanitize_key(wp_unslash($_POST['key']??''));
            unset($all[$slug]['icons'][$key]);update_option(OPTION,$all,false);
        } elseif($mode==='remove') {
            $all=sets();unset($all[$slug]);update_option(OPTION,$all,false);
        } else {
            $name=wp_unslash($_POST['name']??'');
            if($mode==='zip') {
                if(empty($_FILES['archive']) || $_FILES['archive']['error']!==UPLOAD_ERR_OK || !is_uploaded_file($_FILES['archive']['tmp_name'])) fail('Choose a valid IcoMoon ZIP.');
                $icons=import_zip($_FILES['archive']['tmp_name']);
            } elseif($mode==='media') {
                $icons=media_icons(json_decode(wp_unslash($_POST['ids']??'[]'),true));
                // Adding more SVGs to a set keeps existing icons and stable IDs.
                $existing=sets()[$slug?:key_name($name)]??null;
                if($existing) $icons=array_replace($existing['icons'],$icons);
            } else fail('Unknown action.');
            save_set($name,$icons,$slug);
        }
        wp_send_json_success(['sets'=>sets()]);
    } catch(\Throwable $e) { wp_send_json_error(['message'=>$e->getMessage()],400); }
});
function page() {
    if(!current_user_can('manage_options')) return;
    ?>
    <div class="wrap sp-icons-admin"><h1 class="screen-reader-text">Icon library</h1>
      <header class="sp-icons-header"><div><span class="sp-icons-kicker">ASSETS / ICONS</span><h2>Icon library</h2><p>One library. Every button, label and section.</p></div><div class="sp-icons-header-actions"><button class="sp-icon-button" id="sp-icons-add-svg" type="button"><span class="dashicons dashicons-plus-alt2"></span>Add SVG icons</button><button class="sp-icon-button is-primary" id="sp-icons-open-import" type="button"><span class="dashicons dashicons-upload"></span>Import icon set</button></div></header>
      <div class="sp-icons-workspace">
        <aside class="sp-icons-sidebar"><div class="sp-icons-sidebar-label">COLLECTIONS</div><nav id="sp-icons-nav" aria-label="Icon collections"></nav><div class="sp-icons-sidebar-note"><span class="dashicons dashicons-info-outline"></span><p>All icons are available in the editor. Colors follow your design.</p></div></aside>
        <main class="sp-icons-browser"><div class="sp-icons-toolbar"><div><h2 id="sp-icons-active-name">All icons</h2><p id="sp-icons-count"></p></div><label class="sp-icons-search"><span class="dashicons dashicons-search"></span><input id="sp-icons-search" type="search" aria-label="Search icons" placeholder="Search icons…"></label></div><div id="sp-icons-sets"></div><div id="sp-icons-pagination"></div></main>
        <aside class="sp-icons-details" id="sp-icons-details" aria-label="Icon details"><div class="sp-icons-sidebar-label">PREVIEW</div><div id="sp-icons-preview"></div></aside>
      </div>
      <div class="sp-icons-toast" id="sp-icons-status" role="status" aria-live="polite"></div>
      <dialog id="sp-icons-import-dialog" class="sp-icons-dialog" aria-labelledby="sp-icons-import-title"><form method="dialog"><button class="sp-icons-close" aria-label="Close import" value="cancel"><span class="dashicons dashicons-no-alt"></span></button></form><span class="sp-icons-dialog-symbol dashicons dashicons-category"></span><h2 id="sp-icons-import-title">Add to your library</h2><p>Import an IcoMoon project or build a collection from your SVGs.</p><div class="sp-icons-source-tabs" role="group" aria-label="Import source"><button id="sp-icons-source-zip" type="button" aria-pressed="true">IcoMoon ZIP</button><button id="sp-icons-source-media" type="button" aria-pressed="false">Media Library</button></div><label class="sp-icons-field-label" for="sp-icons-name">Collection name</label><input id="sp-icons-name" type="text" placeholder="e.g. Brand icons" maxlength="80"><p class="sp-icons-help">Use an existing name to update a collection without changing its icon IDs.</p><div id="sp-icons-zip-fields"><label class="sp-icons-upload" id="sp-icons-dropzone" for="sp-icons-archive"><span class="dashicons dashicons-cloud-upload"></span><strong id="sp-icons-filename">Drop your ZIP here or browse files</strong><span>IcoMoon export with selection.json · maximum 10 MB</span><input id="sp-icons-archive" type="file" accept=".zip,application/zip"></label><button class="sp-icon-button is-primary sp-icons-submit" id="sp-icons-import" type="button">Import collection<span class="dashicons dashicons-arrow-right-alt2"></span></button></div><div id="sp-icons-media-fields" hidden><div class="sp-icons-media-note"><span class="dashicons dashicons-format-image"></span><p>Choose one or more SVGs, or upload new ones.<br>Use outlined vectors without external resources.</p></div><button class="sp-icon-button is-primary sp-icons-submit" id="sp-icons-media" type="button">Choose SVGs from Media Library<span class="dashicons dashicons-arrow-right-alt2"></span></button></div><p id="sp-icons-dialog-status" role="status"></p></dialog>
    </div>
    <?php
}
