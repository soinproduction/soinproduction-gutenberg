import { createHash, createHmac, randomBytes } from 'node:crypto';
export type ProxyConfig = {
  wordpressUrl: string;
  secret: string;
  allowedOrigin?: string;
  trustedClientHeader?: string;
};
async function boundedBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return '';
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16000) {
      await reader.cancel();
      throw new Error('too_large');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}
export async function formProxy(request: Request, id: string, config: ProxyConfig) {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (!/^\d+$/.test(id)) return Response.json({ error: 'Not found' }, { status: 404, headers });
  if (config.secret.length < 32)
    return Response.json({ error: 'Unavailable' }, { status: 503, headers });
  const expected = config.allowedOrigin ?? new URL(request.url).origin;
  if (
    request.method === 'POST' &&
    (request.headers.get('origin') !== expected ||
      !request.headers.get('content-type')?.startsWith('application/json'))
  )
    return Response.json({ error: 'Invalid request' }, { status: 403, headers });
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    return Response.json({ error: 'Invalid request' }, { status: 403, headers });
  const cookie = request.headers
    .get('cookie')
    ?.match(/(?:^|;\s*)fe_session=([a-f0-9]{64})\.([a-f0-9]{64})(?:;|$)/);
  let session = cookie?.[1];
  if (
    !session ||
    !cookie ||
    cookie[2] !== createHmac('sha256', config.secret).update(session).digest('hex')
  )
    session = randomBytes(32).toString('hex');
  const trusted =
    config.trustedClientHeader &&
    ['x-real-ip', 'x-forwarded-for', 'cf-connecting-ip'].includes(config.trustedClientHeader)
      ? request.headers.get(config.trustedClientHeader)?.split(',')[0]?.trim()
      : undefined;
  const client = createHash('sha256')
    .update((trusted || session) + '|' + config.secret)
    .digest('hex');
  try {
    const input = request.method === 'POST' ? JSON.parse(await boundedBody(request)) : {};
    if (
      request.method === 'POST' &&
      (!input ||
        typeof input.values !== 'object' ||
        input.values === null ||
        Array.isArray(input.values))
    )
      return Response.json({ error: 'Invalid fields' }, { status: 400, headers });
    const body = JSON.stringify(
      request.method === 'POST'
        ? {
            values: input.values,
            website: input.website ?? '',
            challenge: input.challenge,
            turnstile: input.turnstile ?? '',
            client,
          }
        : { client }
    );
    const time = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', config.secret)
      .update('POST:' + id + ':' + time + ':' + body)
      .digest('hex');
    const response = await fetch(
      config.wordpressUrl.replace(/\/$/, '') +
        '/wp-json/form-engine/v1/forms/' +
        id +
        (request.method === 'POST' ? '/submit' : '/challenge'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Form-Time': time,
          'X-Form-Signature': signature,
        },
        body,
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      }
    );
    const result = response.ok
      ? await response.json()
      : { error: 'Unable to submit form. Please check your data or try again later.' };
    const output = new Headers(headers);
    if (request.method === 'GET')
      output.append(
        'Set-Cookie',
        'fe_session=' +
          session +
          '.' +
          createHmac('sha256', config.secret).update(session).digest('hex') +
          '; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400' +
          (new URL(expected).protocol === 'https:' ? '; Secure' : '')
      );
    return Response.json(result, { status: response.status, headers: output });
  } catch (error) {
    return Response.json(
      { error: 'Unable to submit form' },
      { status: error instanceof Error && error.message === 'too_large' ? 413 : 503, headers }
    );
  }
}
