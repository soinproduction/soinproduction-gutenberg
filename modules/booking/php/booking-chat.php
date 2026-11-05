<?php
namespace SiteTheme\Booking;
defined('ABSPATH') || exit;
const CHAT_FILE_LIMIT=10485760;
function install_chat(){
    if(!current_user_can('manage_options') || get_option('site_booking_chat_schema')==='2')return;
    global $wpdb;require_once ABSPATH.'wp-admin/includes/upgrade.php';$charset=$wpdb->get_charset_collate();
    dbDelta('CREATE TABLE '.table('chat_files')." (id bigint unsigned NOT NULL AUTO_INCREMENT,
        booking_id bigint unsigned NOT NULL,
        name varchar(180) NOT NULL,
        mime varchar(100) NOT NULL,
        size bigint unsigned NOT NULL,
        path varchar(100) NOT NULL DEFAULT '',
        telegram_id varchar(255) NOT NULL DEFAULT '',
        telegram_kind varchar(12) NOT NULL DEFAULT 'document',
        created_at datetime NOT NULL,
        PRIMARY KEY  (id),
        KEY booking_id (booking_id)
    ) ENGINE=InnoDB $charset;");
    dbDelta('CREATE TABLE '.table('chat_messages')." (id bigint unsigned NOT NULL AUTO_INCREMENT,
        booking_id bigint unsigned NOT NULL,
        direction varchar(12) NOT NULL,
        actor varchar(80) NOT NULL,
        body text NOT NULL,
        attachment_id bigint unsigned NULL,
        delivery_key varchar(64) NOT NULL,
        created_at datetime NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY delivery_key (delivery_key),
        KEY booking_id (booking_id,id)
    ) ENGINE=InnoDB $charset;");
    if(!$wpdb->get_var("SHOW COLUMNS FROM ".table('outbox')." LIKE 'attachment_id'"))$wpdb->query('ALTER TABLE '.table('outbox').' ADD attachment_id bigint unsigned NULL');
    if(!$wpdb->get_var("SHOW COLUMNS FROM ".table('outbox')." LIKE 'attachment_id'"))return;
    foreach(['outbox','chat_messages'] as $table_name)if(!$wpdb->get_var("SHOW COLUMNS FROM ".table($table_name)." LIKE 'attachments'"))$wpdb->query('ALTER TABLE '.table($table_name).' ADD attachments text NULL');
    update_option('site_booking_chat_schema','2',false);
}
add_action('admin_init',__NAMESPACE__.'\\install_chat',20);
function chat_record($id,$direction,$actor,$body,$key,$attachment=0,$created=null,$hashed=false,$attachments=[]){
    if(get_option('site_booking_chat_schema')!=='2')return;
    global $wpdb;$wpdb->query($wpdb->prepare('INSERT IGNORE INTO '.table('chat_messages').' (booking_id,direction,actor,body,attachment_id,delivery_key,created_at) VALUES (%d,%s,%s,%s,%d,%s,%s)',$id,$direction,$actor,$body,$attachment,$hashed?$key:hash('sha256',$key),$created ?: gmdate('Y-m-d H:i:s')));
    if($wpdb->last_error)throw new \RuntimeException('chat_history');
    if($attachments)$wpdb->update(table('chat_messages'),['attachments'=>wp_json_encode(array_values($attachments))],['delivery_key'=>$hashed?$key:hash('sha256',$key)]);
}
function chat_file_key(){
    return hash('sha256',defined('SITE_BOOKING_ENCRYPTION_KEY') && strlen(SITE_BOOKING_ENCRYPTION_KEY)>=32?SITE_BOOKING_ENCRYPTION_KEY:wp_salt('secure_auth'),true);
}
function chat_encrypt($bytes){
    $iv=random_bytes(12);$tag='';$encrypted=openssl_encrypt($bytes,'aes-256-gcm',chat_file_key(),OPENSSL_RAW_DATA,$iv,$tag);
    return $encrypted===false?false:$iv.$tag.$encrypted;
}
function chat_decrypt($raw){
    return openssl_decrypt(substr($raw,28),'aes-256-gcm',chat_file_key(),OPENSSL_RAW_DATA,substr($raw,0,12),substr($raw,12,16));
}
function chat_file_folder(){
    $upload=wp_upload_dir();if(!empty($upload['error']))return error('file_storage',t('Не вдалося відкрити сховище файлів.'),503);
    $path=$upload['basedir'].'/site-booking-private';if(!wp_mkdir_p($path))return error('file_storage',t('Не вдалося відкрити сховище файлів.'),503);
    if(!file_exists($path.'/.htaccess'))file_put_contents($path.'/.htaccess',"Require all denied\nDeny from all\n");
    if(!file_exists($path.'/index.php'))file_put_contents($path.'/index.php',"<?php // Private encrypted booking attachments.\n");
    return $path;
}
function chat_store_upload($booking,$file){
    if(get_option('site_booking_chat_schema')!=='2')return error('file_storage',t('Сховище ще не готове.'),503);
    if(($file['error'] ?? UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK || empty($file['tmp_name']) || !is_uploaded_file($file['tmp_name']))return error('invalid_file',t('Не вдалося завантажити файл.'));
    return chat_store_local_file($booking,$file['tmp_name'],$file['name'] ?? 'file');
}
function chat_store_local_file($booking,$source,$name){
    $size=filesize($source);if(!$size || $size>CHAT_FILE_LIMIT)return error('file_size',t('Файл має бути не більше 10 МБ.'));
    $allowed=['jpg|jpeg'=>'image/jpeg','png'=>'image/png','webp'=>'image/webp','pdf'=>'application/pdf','txt'=>'text/plain','csv'=>'text/csv','zip'=>'application/zip','docx'=>'application/vnd.openxmlformats-officedocument.wordprocessingml.document','xlsx'=>'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    $name=mb_substr(sanitize_file_name($name),0,180);$type=wp_check_filetype_and_ext($source,$name,$allowed);
    if(!$type['ext'] || !$type['type'])return error('file_type',t('Дозволено JPG, PNG, WebP, PDF, TXT, CSV, ZIP, DOCX і XLSX.'));
    $folder=chat_file_folder();if(is_wp_error($folder))return $folder;
    $encrypted=chat_encrypt(file_get_contents($source));
    if($encrypted===false)return error('file_storage',t('Не вдалося зберегти файл.'),500);
    $path=bin2hex(random_bytes(24)).'.bin';if(file_put_contents($folder.'/'.$path,$encrypted,LOCK_EX)===false)return error('file_storage',t('Не вдалося зберегти файл.'),500);chmod($folder.'/'.$path,0600);
    global $wpdb;$ok=$wpdb->insert(table('chat_files'),['booking_id'=>$booking,'name'=>$name,'mime'=>$type['type'],'size'=>$size,'path'=>$path,'created_at'=>gmdate('Y-m-d H:i:s')]);
    if(!$ok){unlink($folder.'/'.$path);return error('file_storage',t('Не вдалося зберегти файл.'),500);}return (int)$wpdb->insert_id;
}
function chat_file($id,$booking){global $wpdb;return $wpdb->get_row($wpdb->prepare('SELECT * FROM '.table('chat_files').' WHERE id=%d AND booking_id=%d',$id,$booking));}
function chat_file_bytes($file){
    if($file->path){$folder=chat_file_folder();if(is_wp_error($folder))return $folder;if(!preg_match('/^[a-f0-9]{48}\.bin$/D',$file->path) || !is_file($folder.'/'.$file->path))return error('file_missing',t('Файл не знайдено.'),404);$bytes=chat_decrypt(file_get_contents($folder.'/'.$file->path));if($bytes===false){error_log('[site-booking] chat file '.$file->id.' cannot be decrypted');return error('file_storage',t('Не вдалося прочитати файл.'),500);}return $bytes;}
    $remote=telegram_api('getFile',['file_id'=>$file->telegram_id]);if(is_wp_error($remote))return $remote;$path=$remote['file_path'] ?? '';
    if(!$path || str_contains($path,'..') || !preg_match('#^[a-zA-Z0-9_./-]+$#D',$path) || ($remote['file_size'] ?? 0)>CHAT_FILE_LIMIT)return error('file_size',t('Файл недоступний або більший за 10 МБ.'));
    $response=wp_remote_get('https://api.telegram.org/file/bot'.telegram_token().'/'.$path,['timeout'=>30,'redirection'=>0,'limit_response_size'=>CHAT_FILE_LIMIT+1]);
    if(is_wp_error($response) || wp_remote_retrieve_response_code($response)!==200)return error('file_download',t('Не вдалося отримати файл із Telegram.'),503);
    $bytes=wp_remote_retrieve_body($response);return strlen($bytes)>CHAT_FILE_LIMIT?error('file_size',t('Файл більший за 10 МБ.')):$bytes;
}
function chat_remove_file($id,$booking){
    global $wpdb;$file=chat_file($id,$booking);if(!$file)return;if($file->path){$folder=chat_file_folder();if(!is_wp_error($folder) && preg_match('/^[a-f0-9]{48}\.bin$/D',$file->path) && is_file($folder.'/'.$file->path))unlink($folder.'/'.$file->path);}$previewFolder=chat_file_folder();if(!is_wp_error($previewFolder)){$preview=$previewFolder.'/'.hash('sha256','preview:'.$file->id.':'.$file->created_at).'.preview.bin';if(is_file($preview))unlink($preview);}$wpdb->delete(table('chat_files'),['id'=>$id,'booking_id'=>$booking]);
}
function chat_telegram_attachment($booking,$message){
    $kind='document';$file=$message['document'] ?? null;
    if(!$file && !empty($message['photo'])){$file=end($message['photo']);$kind='photo';$file['file_name']='photo.jpg';$file['mime_type']='image/jpeg';}
    if(!$file)return 0;if(($file['file_size'] ?? 0)>CHAT_FILE_LIMIT)return error('file_size',t('Файл має бути не більше 10 МБ.'));
    global $wpdb;$wpdb->insert(table('chat_files'),['booking_id'=>$booking,'name'=>mb_substr(sanitize_file_name($file['file_name'] ?? 'document'),0,180),'mime'=>sanitize_mime_type($file['mime_type'] ?? 'application/octet-stream'),'size'=>(int)($file['file_size'] ?? 0),'telegram_id'=>sanitize_text_field($file['file_id']),'telegram_kind'=>$kind,'created_at'=>gmdate('Y-m-d H:i:s')]);return (int)$wpdb->insert_id ?: error('file_storage',t('Не вдалося зберегти файл.'));
}
function chat_send_attachment($job,$data){
    $file=chat_file($job->attachment_id,$job->booking_id);if(!$file)return error('file_missing',t('Файл не знайдено.'),400);
    unset($data['text']);$data['caption']=$job->message;
    $method=$file->telegram_kind==='photo'?'sendPhoto':'sendDocument';$field=$file->telegram_kind==='photo'?'photo':'document';
    if($file->telegram_id){$data[$field]=$file->telegram_id;return telegram_api($method,$data);}
    $bytes=chat_file_bytes($file);if(is_wp_error($bytes))return $bytes;
    $boundary='site'.bin2hex(random_bytes(16));$body='';foreach($data as $key=>$value){$body.='--'.$boundary."\r\nContent-Disposition: form-data; name=\"".$key."\"\r\n\r\n".(is_array($value)?wp_json_encode($value):$value)."\r\n";}
    $body.='--'.$boundary."\r\nContent-Disposition: form-data; name=\"document\"; filename=\"".sanitize_file_name($file->name)."\"\r\nContent-Type: ".$file->mime."\r\n\r\n".$bytes."\r\n--".$boundary."--\r\n";
    $response=wp_remote_post('https://api.telegram.org/bot'.telegram_token().'/sendDocument',['timeout'=>45,'redirection'=>0,'headers'=>['Content-Type'=>'multipart/form-data; boundary='.$boundary],'body'=>$body]);
    if(is_wp_error($response))return error('telegram_network',t('Не вдалося передати файл у Telegram.'),503);
    $result=json_decode(wp_remote_retrieve_body($response),true);if(empty($result['ok']))return error('telegram_api',t('Telegram не прийняв файл.'),(int)($result['error_code'] ?? 503));
    if(!empty($result['result']['document']['file_id'])){global $wpdb;$wpdb->update(table('chat_files'),['telegram_id'=>$result['result']['document']['file_id']],['id'=>$file->id]);}return $result['result'];
}
function chat_history($id,$before=0){
    global $wpdb;$rows=$wpdb->get_results($wpdb->prepare('SELECT m.*,o.status,o.last_error FROM '.table('chat_messages').' m LEFT JOIN '.table('outbox').' o ON o.dedupe=m.delivery_key WHERE m.booking_id=%d AND (%d=0 OR m.id<%d) ORDER BY m.id DESC LIMIT 100',$id,$before,$before));$result=[];
    foreach($rows as $row){$file=$row->attachment_id?chat_file($row->attachment_id,$id):null;$files=[];foreach(json_decode($row->attachments ?: '[]',true) as $file_id){$item=chat_file($file_id,$id);if($item)$files[]=['id'=>(int)$item->id,'name'=>$item->name,'mime'=>$item->mime,'size'=>(int)$item->size];}$result[]=['id'=>(int)$row->id,'direction'=>$row->direction,'body'=>$row->body,'time'=>display_time($row->created_at),'status'=>$row->direction==='client'?'received':($row->status ?: 'pending'),'error'=>$row->last_error ?: '', 'files'=>$files,'file'=>$file?['id'=>(int)$file->id,'name'=>$file->name,'mime'=>$file->mime,'size'=>(int)$file->size]:null];}return array_reverse($result);
}
add_action('rest_api_init',function(){
    $permission=fn()=>current_user_can('manage_bookings');
    register_rest_route('site/v1','/admin/bookings/(?P<id>\d+)/uploads',['methods'=>'POST','permission_callback'=>$permission,'callback'=>function($request){
        if(!telegram_booking_row((int)$request['id']))return error('not_found',t('Бронювання не знайдено.'),404);
        $files=$request->get_file_params();if(empty($files['file']))return error('missing_file',t('Оберіть файл.'));
        $id=chat_store_upload((int)$request['id'],$files['file']);return is_wp_error($id)?$id:new \WP_REST_Response(['id'=>$id],201);
    }]);
    register_rest_route('site/v1','/admin/bookings/(?P<id>\d+)/uploads/(?P<file>\d+)',['methods'=>'DELETE','permission_callback'=>$permission,'callback'=>function($request){
        global $wpdb;$id=(int)$request['file'];$booking=(int)$request['id'];if(!chat_file($id,$booking))return error('file_missing',t('Файл не знайдено.'),404);
        if(chat_file_in_use($id,$booking) || $wpdb->get_var($wpdb->prepare('SELECT id FROM '.table('outbox').' WHERE attachment_id=%d LIMIT 1',$id)))return error('file_in_use',t('Файл уже надіслано.'),409);
        chat_remove_file($id,$booking);return rest_ensure_response(['removed'=>true]);
    }]);

    register_rest_route('site/v1','/admin/bookings/(?P<id>\d+)/messages',['methods'=>'GET','permission_callback'=>$permission,'callback'=>function($request){$response=new \WP_REST_Response(['messages'=>$messages=chat_history((int)$request['id'],absint($request['before'] ?? 0)),'more'=>count($messages)===100]);$response->header('Cache-Control','private, no-store');return $response;}]);
    register_rest_route('site/v1','/admin/bookings/(?P<id>\d+)/files/(?P<file>\d+)',['methods'=>'GET','permission_callback'=>$permission,'callback'=>function($request){$file=chat_file((int)$request['file'],(int)$request['id']);return $file?rest_ensure_response(['_site_chat_file'=>(int)$file->id,'booking_id'=>(int)$request['id'],'_site_chat_view'=>in_array($request['view'],['preview','image'],true)?$request['view']:'']):error('file_missing',t('Файл не знайдено.'),404);}]);
});
add_filter('rest_pre_serve_request',function($served,$response,$request){
    if(!preg_match('#^/site/v1/admin/bookings/\d+/files/\d+$#D',$request->get_route()) || $response->get_status()!==200)return $served;
    $data=$response->get_data();if(empty($data['_site_chat_file']) || !current_user_can('manage_bookings'))return $served;
    $file=chat_file($data['_site_chat_file'],$data['booking_id']);$bytes=$file?(($data['_site_chat_view'] ?? '')==='preview'?chat_image_preview($file):chat_file_bytes($file)):error('file_missing',t('Файл не знайдено.'),404);
    if(is_wp_error($bytes)){status_header(503);header('Content-Type: text/plain; charset=utf-8');echo $bytes->get_error_message();return true;}
    $inline=in_array($data['_site_chat_view'] ?? '',['preview','image'],true);$mime='application/octet-stream';
    if($inline){$image=@getimagesizefromstring($bytes);if(!$image || !in_array($image['mime'] ?? '',['image/jpeg','image/png','image/webp'],true)){status_header(415);echo t('Попередній перегляд недоступний');return true;}$mime=$image['mime'];header("Content-Security-Policy: default-src 'none'; sandbox");}
    header('Content-Type: '.$mime);header('X-Content-Type-Options: nosniff');header('Cache-Control: private, no-store');header("Content-Disposition: ".($inline?'inline':'attachment')."; filename*=UTF-8''".rawurlencode($file->name));header('Content-Length: '.strlen($bytes));echo $bytes;return true;
},10,3);

function chat_file_in_use($id,$booking){
    global $wpdb;
    foreach(['chat_messages','outbox'] as $name){$rows=$wpdb->get_results($wpdb->prepare('SELECT attachment_id,attachments FROM '.table($name).' WHERE booking_id=%d',$booking));foreach($rows as $row)if((int)$row->attachment_id===(int)$id || in_array((int)$id,array_map('intval',json_decode($row->attachments ?: '[]',true)),true))return true;}
    return false;
}
function chat_send_album($job,$data){
    $ids=array_map('intval',json_decode($job->attachments,true) ?: []);if(count($ids)<2 || count($ids)>10)return error('invalid_album',t('В альбомі має бути від 2 до 10 файлів.'),400);
    $media=[];$uploads=[];$files=[];$temporary=[];
    try{
        foreach($ids as $index=>$id){
            $file=chat_file($id,$job->booking_id);if(!$file)return error('file_missing',t('Один із файлів не знайдено.'),400);$files[]=$file;
            $entry=['type'=>'document'];if($index===0)$entry['caption']=$job->message;
            if($file->telegram_id && $file->telegram_kind==='document')$entry['media']=$file->telegram_id;
            else{
                $bytes=chat_file_bytes($file);if(is_wp_error($bytes))return $bytes;
                $path=wp_tempnam($file->name);if(!$path || file_put_contents($path,$bytes)===false)return error('file_storage',t('Не вдалося підготувати альбом.'),503);chmod($path,0600);$temporary[]=$path;unset($bytes);
                $field='file'.$index;$entry['media']='attach://'.$field;$uploads[$field]=['path'=>$path,'mime'=>$file->mime,'name'=>$file->name];
            }
            $media[]=$entry;
        }
        // Documents are grouped to preserve the original files without image recompression.
        $fields=['chat_id'=>$job->recipient,'media'=>$media];if(!empty($data['message_thread_id']))$fields['message_thread_id']=$data['message_thread_id'];
        if(!$uploads)$result=telegram_api('sendMediaGroup',$fields);
        else{
            $mock=apply_filters('site_booking_album_transport',null,$fields,$uploads);
            if($mock!==null)$result=$mock;
            else{
                if(!function_exists('curl_init'))return error('album_transport',t('Для надсилання альбому потрібен cURL.'),503);
                $post=['chat_id'=>$job->recipient,'media'=>wp_json_encode($media)];if(!empty($data['message_thread_id']))$post['message_thread_id']=$data['message_thread_id'];foreach($uploads as $field=>$file)$post[$field]=new \CURLFile($file['path'],$file['mime'],$file['name']);
                $curl=curl_init('https://api.telegram.org/bot'.telegram_token().'/sendMediaGroup');
                curl_setopt_array($curl,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>$post,CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>120,CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_CAINFO=>ABSPATH.WPINC.'/certificates/ca-bundle.crt']);
                $raw=curl_exec($curl);$status=(int)curl_getinfo($curl,CURLINFO_RESPONSE_CODE);curl_close($curl);
                $response=$raw?json_decode($raw,true):[];
                $result=!empty($response['ok'])?$response['result']:error('album_send',t('Telegram не прийняв альбом. Спробуйте надіслати ще раз.'),(int)($response['error_code'] ?? ($status ?: 503)));
            }
        }
        if(!is_wp_error($result)){
            global $wpdb;foreach($result as $index=>$message)if(isset($files[$index]) && !empty($message['document']['file_id']))$wpdb->update(table('chat_files'),['telegram_id'=>$message['document']['file_id'],'telegram_kind'=>'document'],['id'=>$files[$index]->id]);
        }
        return $result;
    }finally{foreach($temporary as $path)if(is_file($path))unlink($path);}
}

function chat_image_preview($file){
    $folder=chat_file_folder();if(is_wp_error($folder))return $folder;
    $cache=$folder.'/'.hash('sha256','preview:'.$file->id.':'.$file->created_at).'.preview.bin';
    if(is_file($cache)){$bytes=chat_decrypt(file_get_contents($cache));if($bytes!==false)return $bytes;}
    $bytes=chat_file_bytes($file);if(is_wp_error($bytes))return $bytes;$size=@getimagesizefromstring($bytes);
    if(!$size || !in_array($size['mime'] ?? '',['image/jpeg','image/png','image/webp'],true))return error('not_image',t('Цей файл не підтримує попередній перегляд.'),415);
    if($size[0]*$size[1]>60000000)return error('image_size',t('Відкрийте оригінал зображення.'),415);
    $source=wp_tempnam('booking-preview');$target=$source.'.jpg';
    try{
        file_put_contents($source,$bytes);chmod($source,0600);$editor=wp_get_image_editor($source);
        if(is_wp_error($editor))return $bytes;$resize=$editor->resize(640,640,false);if(is_wp_error($resize))return $bytes;
        $saved=$editor->save($target,'image/jpeg');if(is_wp_error($saved))return $bytes;
        $preview=file_get_contents($saved['path']);$encrypted=chat_encrypt($preview);if($encrypted!==false){file_put_contents($cache,$encrypted,LOCK_EX);chmod($cache,0600);}return $preview;
    }finally{if(is_file($source))unlink($source);if(is_file($target))unlink($target);}
}
