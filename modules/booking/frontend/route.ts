import { createHmac } from 'node:crypto';
// WordPress sees only this server's address, so the visitor IP travels as a signed header.
function clientHeaders(request: Request): Record<string,string> {
  const secret=process.env.PREVIEW_SECRET ?? '';
  const header=(process.env.SITE_CLIENT_IP_HEADER || 'x-forwarded-for').toLowerCase();
  if(secret.length<32 || !['x-forwarded-for','x-real-ip','cf-connecting-ip'].includes(header))return {};
  // The last forwarded entry is the one appended by the nearest proxy, not by the client.
  const ip=request.headers.get(header)?.split(',').at(-1)?.trim();
  if(!ip)return {};
  const time=String(Math.floor(Date.now()/1000));
  const key=createHmac('sha256',secret).update('booking-client-ip').digest('hex');
  return {'X-Site-Client-Ip':ip,'X-Site-Client-Time':time,'X-Site-Client-Signature':createHmac('sha256',key).update(`${time}:${ip}`).digest('hex')};
}
export function bookingRoutes(wordpressUrl:()=>string){
 async function GET(request: Request,{params}:{params:Promise<{resource:string}>}) {
  const {resource}=await params;
  if(!['config','availability'].includes(resource))return Response.json({message:'Not found'},{status:404});
  const input=new URL(request.url);const query=new URLSearchParams();
  if(resource==='availability')for(const key of ['from','to'])query.set(key,input.searchParams.get(key) || '');
  try {
    const response=await fetch(`${wordpressUrl().replace(/\/$/,'')}/wp-json/site/v1/booking/${resource}?${query}`,{cache:'no-store',signal:AbortSignal.timeout(15000)});
    return Response.json(await response.json(),{status:response.status,headers:{'Cache-Control':'no-store'}});
  } catch {return Response.json({message:'Розклад тимчасово недоступний. Спробуйте ще раз.'},{status:502,headers:{'Cache-Control':'no-store'}});}
}

 async function POST(request: Request,{params}:{params:Promise<{resource:string}>}) {
  const {resource}=await params;
  if(!['reservations','status'].includes(resource))return Response.json({message:'Not found'},{status:404});
  const origin=request.headers.get('origin');
  // Next may build request.url from its listening address (localhost), while the
  // browser uses 127.0.0.1 or the public reverse-proxy host. Compare the browser
  // origin with the incoming Host header, which browsers cannot set via fetch.
  if(origin){
    let allowed=false;
    try { const source=new URL(origin);allowed=['http:','https:'].includes(source.protocol) && source.host===(request.headers.get('host') || new URL(request.url).host); }catch{}
    if(!allowed)return Response.json({message:'Недозволений запит.'},{status:403});
  }
  try {
    const body=await request.text();
    if(body.length>4096)return Response.json({message:'Завеликий запит.'},{status:413});
    const response=await fetch(`${wordpressUrl().replace(/\/$/,'')}/wp-json/site/v1/booking/${resource}`,{method:'POST',headers:{'Content-Type':'application/json',...clientHeaders(request)},body,cache:'no-store',signal:AbortSignal.timeout(15000)});
    return Response.json(await response.json(),{status:response.status,headers:{'Cache-Control':'no-store'}});
  }catch{return Response.json({message:'Не вдалося підтвердити бронювання. Спробуйте ще раз.'},{status:502});}
}
 return {GET,POST};
}
