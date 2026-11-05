<?php
namespace SiteTheme\Booking;
defined('ABSPATH') || exit;

function history_where(){
    return "(b.status IN ('cancelled','cancelled_late','completed') OR (b.type='block' AND b.cancelled_at IS NOT NULL)) AND NOT EXISTS (SELECT 1 FROM ".table('refunds')." r WHERE r.booking_id=b.id AND r.status='pending')";
}
function history_rows($ids=null,$lock=false){
    global $wpdb;$where=history_where();
    if($ids!==null){$ids=array_values(array_filter(array_map('absint',$ids)));if(!$ids)return []; $where.=' AND b.id IN ('.implode(',',$ids).')';}
    return $wpdb->get_results('SELECT b.id,b.client_id,b.status,b.version,b.updated_at,b.cancelled_at FROM '.table('bookings').' b WHERE '.$where.' ORDER BY b.id LIMIT 5001'.($lock?' FOR UPDATE':''),ARRAY_A);
}
function history_table_exists($name){global $wpdb;return (bool)$wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s',$wpdb->esc_like(table($name))));}
function history_preview($ids=null){
    if(!current_user_can('manage_options'))return error('forbidden',t('Очищення доступне лише адміністратору.'),403);
    global $wpdb;$rows=history_rows($ids);if(count($rows)>5000)return error('history_limit',t('Забагато записів для одного очищення. Зверніться до адміністратора сервера.'));
    $ids=array_column($rows,'id');$counts=['bookings'=>count($ids),'messages'=>0,'files'=>0,'events'=>0];
    if($ids)foreach(['messages'=>'chat_messages','files'=>'chat_files','events'=>'events'] as $key=>$name)if(history_table_exists($name))$counts[$key]=(int)$wpdb->get_var('SELECT COUNT(*) FROM '.table($name).' WHERE booking_id IN ('.implode(',',$ids).')');
    $token=wp_generate_password(40,false,false);
    set_transient('site_booking_history_'.hash('sha256',$token),['user'=>get_current_user_id(),'ids'=>$ids,'fingerprint'=>hash('sha256',wp_json_encode($rows))],10*MINUTE_IN_SECONDS);
    return ['token'=>$token,'counts'=>$counts];
}
function history_delete($token,$confirmation){
    if(!current_user_can('manage_options'))return error('forbidden',t('Очищення доступне лише адміністратору.'),403);
    if($confirmation!=='ВИДАЛИТИ')return error('confirmation',t('Введіть ВИДАЛИТИ для підтвердження.'));
    $key='site_booking_history_'.hash('sha256',(string)$token);$preview=get_transient($key);
    if(!$preview || $preview['user']!==get_current_user_id())return error('preview_expired',t('Підтвердження застаріло. Відкрийте очищення знову.'),409);
    $ids=array_map('absint',$preview['ids']);if(!$ids){delete_transient($key);return ['deleted'=>0];}
    if(!add_option('site_booking_delivery_lock',time(),'','no'))return error('delivery_busy',t('Зараз надсилаються сповіщення. Повторіть очищення за кілька секунд.'),409);
    global $wpdb;$paths=[];$chat_ids=[];$committed=false;
    try{
        if($wpdb->query('START TRANSACTION')===false)throw new \RuntimeException('transaction');
        $rows=history_rows($ids,true);
        if(!hash_equals($preview['fingerprint'],hash('sha256',wp_json_encode($rows)))){$wpdb->query('ROLLBACK');return error('history_changed',t('Записи змінилися. Відкрийте очищення знову й перевірте список.'),409);}
        $in=implode(',',$ids);$clients=array_values(array_filter(array_unique(array_column($rows,'client_id'))));
        if(history_table_exists('chat_files')){
            $folder=chat_file_folder();if(is_wp_error($folder)){$wpdb->query('ROLLBACK');return $folder;}
            foreach($wpdb->get_results('SELECT * FROM '.table('chat_files').' WHERE booking_id IN ('.$in.')') as $file){
                if(preg_match('/^[a-f0-9]{48}\.bin$/D',$file->path))$paths[]=$folder.'/'.$file->path;
                $paths[]=$folder.'/'.hash('sha256','preview:'.$file->id.':'.$file->created_at).'.preview.bin';
            }
        }
        if(history_table_exists('telegram_links'))$chat_ids=$wpdb->get_col('SELECT DISTINCT chat_id FROM '.table('telegram_links').' WHERE booking_id IN ('.$in.') AND chat_id IS NOT NULL');
        foreach(['slots','events','refunds','telegram_links','telegram_replies','telegram_topics','chat_messages','chat_files','outbox'] as $name)if(history_table_exists($name) && $wpdb->query('DELETE FROM '.table($name).' WHERE booking_id IN ('.$in.')')===false)throw new \RuntimeException('delete');
        if($wpdb->query('DELETE FROM '.table('bookings').' WHERE id IN ('.$in.')')===false)throw new \RuntimeException('delete');
        if($clients && $wpdb->query('DELETE c FROM '.table('clients').' c WHERE c.id IN ('.implode(',',array_map('absint',$clients)).') AND NOT EXISTS (SELECT 1 FROM '.table('bookings').' b WHERE b.client_id=c.id)')===false)throw new \RuntimeException('clients');
        if($wpdb->query('COMMIT')===false)throw new \RuntimeException('commit');$committed=true;delete_transient($key);
        foreach($chat_ids as $chat){$context='site_booking_support_'.hash('sha256',(string)$chat);if(in_array((int)get_transient($context),$ids,true))delete_transient($context);}
        $remaining=0;foreach(array_unique($paths) as $path)if(is_file($path) && !unlink($path))$remaining++;
        return ['deleted'=>count($ids),'file_cleanup_pending'=>$remaining];
    }catch(\Throwable $e){if(!$committed)$wpdb->query('ROLLBACK');log_failure('history',$e);return error('history_storage',t('Не вдалося очистити історію. Дані збережено.'),500);}
    finally{delete_option('site_booking_delivery_lock');}
}
add_action('rest_api_init',function(){
    $permission=fn()=>current_user_can('manage_options');
    register_rest_route('site/v1','/admin/bookings/history/preview',['methods'=>'POST','permission_callback'=>$permission,'callback'=>fn()=>history_preview()]);
    register_rest_route('site/v1','/admin/bookings/history/delete',['methods'=>'POST','permission_callback'=>$permission,'callback'=>fn($r)=>history_delete((string)$r['token'],(string)$r['confirmation'])]);
});
