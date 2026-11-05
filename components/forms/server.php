<?php
namespace SiteTheme;
defined('ABSPATH') || exit;
/** Same-origin WordPress adapter; retains FormEngine signatures, challenges and rate limits. */
add_action('rest_api_init',function(){
 register_rest_route('site/v1','/forms/(?P<id>\d+)',['methods'=>['GET','POST'],'permission_callback'=>function($r){
  $origin=$r->get_header('origin');$host=wp_parse_url(home_url(),PHP_URL_HOST);
  return $r->get_header('sec-fetch-site')!=='cross-site'&&(!$origin||wp_parse_url($origin,PHP_URL_HOST)===$host);
 },'callback'=>function($request){
  if(strlen($request->get_body())>20000)return new \WP_Error('too_large','Invalid request',['status'=>413]);
  if(!function_exists('FormEngine\\secret')||strlen(\FormEngine\secret())<32)return new \WP_Error('unavailable','Forms are not configured',['status'=>503]);
  $cookie=$_COOKIE['site_form_session']??'';$parts=explode('.',$cookie);
  if(count($parts)!==2||!preg_match('/^[a-f0-9]{64}$/',$parts[0])||!hash_equals(hash_hmac('sha256',$parts[0],\FormEngine\secret()),$parts[1]))$parts=[bin2hex(random_bytes(32))];
  $token=$parts[0].'./.'.hash_hmac('sha256',$parts[0],\FormEngine\secret());
  $input=$request->get_method()==='POST'?$request->get_json_params():[];
  if($request->get_method()==='POST'&&(!is_array($input)||!is_array($input['values']??null)))return new \WP_Error('invalid_fields','Invalid request',['status'=>400]);
  $input['client']=hash_hmac('sha256',$parts[0],\FormEngine\secret());
  $body=wp_json_encode($input);$time=(string)time();$id=(int)$request['id'];
  $internal=new \WP_REST_Request('POST','/form-engine/v1/forms/'.$id.($request->get_method()==='POST'?'/submit':'/challenge'));
  $internal->set_header('Content-Type','application/json');$internal->set_header('X-Form-Time',$time);$internal->set_header('X-Form-Signature',hash_hmac('sha256','POST:'.$id.':'.$time.':'.$body,\FormEngine\secret()));$internal->set_body($body);
  $response=rest_do_request($internal);$response->header('Cache-Control','no-store');$response->header('Set-Cookie','site_form_session='.$token.'; Path=/; HttpOnly; SameSite=Lax'.(is_ssl()?'; Secure':''));return $response;
 }]);
});
