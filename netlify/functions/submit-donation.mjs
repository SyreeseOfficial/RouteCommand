/* Route Command — Donation Log Proxy
 * After deploying DonationCode.gs as a Google Apps Script web app,
 * paste the web app URL below to replace the placeholder.
 */
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxSsmAZtLZiwWzIRd4KLXl14kfsmTEDn0UzbDR7M7w17CIUwnh6mTDFJYxuj27yEap9ww/exec';

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ status: 'error', message: 'POST only' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.text();

    const gasRes = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      redirect: 'manual',
    });

    const redirectUrl = gasRes.headers.get('location');
    if (!redirectUrl) {
      return new Response(JSON.stringify({ status: 'error', message: 'No redirect from GAS' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const resultRes  = await fetch(redirectUrl);
    const resultText = await resultRes.text();

    return new Response(resultText, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ status: 'error', message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = {
  path: '/api/submit-donation',
};
