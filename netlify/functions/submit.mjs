/* Route Command — GAS proxy (receipt / credit / donation)
 * Forwards JSON to a Google Apps Script web app and follows its 302 redirect
 * to read the real response (GAS can't be fetched from the browser: CORS).
 * Web app URLs live in Netlify env vars, one per route below.
 */
const ROUTES = {
  '/api/submit-receipt':  'GAS_URL_RECEIPT',
  '/api/submit-credit':   'GAS_URL_CREDIT',
  '/api/submit-donation': 'GAS_URL_DONATION',
};

const json = (obj, status) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  if (req.method !== 'POST') return json({ status: 'error', message: 'POST only' }, 405);

  const gasUrl = process.env[ROUTES[new URL(req.url).pathname]];
  if (!gasUrl) return json({ status: 'error', message: 'Endpoint not configured' }, 500);

  try {
    const gasRes = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: await req.text(),
      redirect: 'manual',
    });

    const redirectUrl = gasRes.headers.get('location');
    if (!redirectUrl) return json({ status: 'error', message: 'No redirect from GAS' }, 502);

    const text = await (await fetch(redirectUrl)).text();
    try { JSON.parse(text); } catch {
      /* Google answered with an HTML error page (quota, outage), not our script's JSON */
      return json({ status: 'error', message: 'Google is busy, try again in a minute' }, 502);
    }
    return new Response(text, { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return json({ status: 'error', message: err.message }, 500);
  }
};

export const config = { path: Object.keys(ROUTES) };
