/* Route Command — Credit Submission Proxy
 * After deploying CreditCode.gs as a Google Apps Script web app,
 * paste the web app URL below to replace the placeholder.
 */
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxfH_RppeXQvr6-lQdYq-PGU0wHd_QUErfxB4MukNz9kaDFSFb9z3juHmVqM2C_eqQM/exec';

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
  path: '/api/submit-credit',
};
