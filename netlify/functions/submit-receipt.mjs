const GAS_URL = 'https://script.google.com/macros/s/AKfycbybD1lYj0K_h4hSy8yMu0SopTKAryFpPH-5ILl-LfM_-82xRWb7A_z-WQxiUr1qHdOQeQ/exec';

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ status: 'error', message: 'POST only' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.text();

    // POST to GAS — don't follow the redirect automatically
    const gasRes = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      redirect: 'manual',
    });

    // GAS returns a 302 redirect — follow it as GET to read the response
    const redirectUrl = gasRes.headers.get('location');
    if (!redirectUrl) {
      return new Response(JSON.stringify({ status: 'error', message: 'No redirect from GAS' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const resultRes = await fetch(redirectUrl);
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
  path: '/api/submit-receipt',
};
