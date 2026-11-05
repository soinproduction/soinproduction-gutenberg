<?php
namespace FormEngine;
defined('ABSPATH') || exit;
function template($text,$entry,$post,$html=false) {
    $values=get_post_meta($entry,'_form_engine_fields',true)?:[];
    $display=fn($value)=>is_bool($value)?($value?'Yes':'No'):(string)$value;
    $all=$html?'<table role="presentation" cellpadding="8" cellspacing="0">':'';
    foreach($values as $field) {
        $label=(string)$field['label'];$value=$display($field['value']);
        $all.=$html?'<tr><th align="left">'.esc_html($label).'</th><td>'.nl2br(esc_html($value)).'</td></tr>':$label.': '.$value."\n";
    }
    if($html)$all.='</table>';else $all=rtrim($all);
    $escape=fn($value)=>$html?nl2br(esc_html($value)):$value;
    $tokens=['[_form_title]'=>$escape($post->post_title),'[_entry_id]'=>(string)$entry,'[_all_fields]'=>$all,'{{form_title}}'=>$escape($post->post_title),'{{entry_id}}'=>(string)$entry,'{{all_fields}}'=>$all];
    foreach($values as $field)if(isset($field['id'])) {
        $value=$escape($display($field['value']));
        $tokens['['.$field['id'].']']=$value;$tokens['{{field:'.$field['id'].'}}']=$value;
    }
    $rendered=strtr($text,$tokens);
    return $html?wp_kses_post($rendered):$rendered;
}
function deliver($entry) {
    $form=(int)get_post_meta($entry,'_form_engine_form_id',true);
    $post=get_post($form);
    if(!$post||!get_post($entry))return;
    $lock='_fe_delivery_'.$entry;
    if(!add_option($lock,(string)time(),'','no'))return;
    try {
        $s=settings($form);
        $states=get_post_meta($entry,'_form_engine_delivery',true)?:[];
        $retry=false;
        foreach(['email','webhook','telegram']as $channel) {
            if(empty($s[$channel.'Enabled'])||($states[$channel]['status']??'')==='accepted'||($states[$channel]['attempts']??0)>=3)continue;
            $attempt=($states[$channel]['attempts']??0)+1;
            $ok=false;
            try {
                if($channel==='email') {
                    $headers=['Content-Type: '.(!empty($s['emailHtml'])?'text/html':'text/plain').'; charset=UTF-8'];
                    if(!empty($s['fromEmail'])&&is_email($s['fromEmail']))$headers[]='From: '.preg_replace('/[\r\n<>]+/',' ',wp_strip_all_tags(template($s['fromName']??'',$entry,$post))).' <'.$s['fromEmail'].'>';
                    foreach(['cc'=>'Cc','bcc'=>'Bcc'] as $key=>$name)if(!empty($s[$key]))$headers[]=$name.': '.$s[$key];
                    $fields=get_post_meta($entry,'_form_engine_fields',true)?:[];
                    foreach($fields as $field)if($field['id']===($s['replyToField']??'')&&is_string($field['value'])&&is_email($field['value']))$headers[]='Reply-To: '.$field['value'];
                    $subject=preg_replace('/[\r\n]+/',' ',template($s['subject']??'New submission',$entry,$post));
                    $ok=wp_mail($s['recipient'],$subject,template($s['emailBody']??'[_all_fields]',$entry,$post,!empty($s['emailHtml'])),$headers);
                }
                elseif($channel==='webhook') {
                    $url=$s['webhookUrl']??'';
                    $key=decrypt($s['webhookSecret']??'');
                    if(safe_destination($url)&&strlen($key)>=32) {
                        $body=wp_json_encode(['event'=>'form.submitted','entryId'=>$entry,'form'=>['id'=>$form,'title'=>$post->post_title],'fields'=>get_post_meta($entry,'_form_engine_fields',true)?:[]]);
                        $time=(string)time();
                        $r=wp_safe_remote_post($url,['timeout'=>8,'redirection'=>0,'limit_response_size'=>4096,'headers'=>['Content-Type'=>'application/json','X-Form-Event-ID'=>(string)$entry,'X-Form-Timestamp'=>$time,'X-Form-Signature'=>'sha256='.hash_hmac('sha256',$time.'.'.$body,$key)],'body'=>$body]);
                        $ok=!is_wp_error($r)&&wp_remote_retrieve_response_code($r)>=200&&wp_remote_retrieve_response_code($r)<300;
                    }
                }
                else {
                    $token=decrypt($s['telegramToken']??'');
                    if($token) {
                        $text=mb_substr(template("{{form_title}} #{{entry_id}}\n{{all_fields}}",$entry,$post),0,4000);
                        $r=wp_safe_remote_post('https://api.telegram.org/bot'.$token.'/sendMessage',['timeout'=>8,'redirection'=>0,'limit_response_size'=>4096,'body'=>['chat_id'=>$s['telegramChat'],'text'=>$text,'link_preview_options'=>wp_json_encode(['is_disabled'=>true])]]);
                        $answer=!is_wp_error($r)?json_decode(wp_remote_retrieve_body($r),true):[];
                        $ok=!is_wp_error($r)&&wp_remote_retrieve_response_code($r)===200&&!empty($answer['ok']);
                    }
                }
            }
            catch(\Throwable $failure) {
                $ok=false;
            }
            $states[$channel]=['status'=>$ok?'accepted':'failed','attempts'=>$attempt,'updated'=>time()];
            if(!$ok&&$attempt<3)$retry=true;
            update_post_meta($entry,'_form_engine_delivery',$states);
        }
        if($retry&&!wp_next_scheduled('form_engine_deliver',[$entry]))wp_schedule_single_event(time()+120,'form_engine_deliver',[$entry]);
    }
    finally {
        delete_option($lock);
    }
}
function prune() {
    global $wpdb;
    $keys=$wpdb->get_col("SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE '\\_fe\\_rate\\_%' OR option_name LIKE '\\_fe\\_used\\_%' OR option_name LIKE '\\_fe\\_delivery\\_%'");
    foreach($keys as $key) {
        if(preg_match('/^_fe_(?:rate|used)_(\d+)_/',$key,$m)&&(int)$m[1]<time())delete_option($key);
        elseif(str_starts_with($key,'_fe_delivery_')&&(int)get_option($key)<time()-600)delete_option($key);
    }
}

/** Reset only failed channels after an administrator fixes delivery settings. */
function retry_failed($entry) {
    if (get_post_type($entry) !== config('entry_type')) return false;
    $states = get_post_meta($entry, '_form_engine_delivery', true) ?: [];
    $changed = false;
    foreach ($states as &$state) {
        if (($state['status'] ?? '') !== 'failed') continue;
        $state = ['status' => 'queued', 'attempts' => 0];
        $changed = true;
    }
    unset($state);
    if (!$changed) return false;
    update_post_meta($entry, '_form_engine_delivery', $states);
    if (!wp_next_scheduled('form_engine_deliver', [$entry])) wp_schedule_single_event(time() + 1, 'form_engine_deliver', [$entry]);
    return true;
}
