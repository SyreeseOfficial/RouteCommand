/* Route Command — Donation Log Proxy
 * After deploying DonationCode.gs as a Google Apps Script web app,
 * paste the web app URL below to replace the placeholder.
 */
import { gasProxy } from './_gasProxy.mjs';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzOkVZCAmk0MDVPq_7Wf7N3K3WXg1AhoCxyin_IFa9TzslGDVmq-3R4rpjO5sFDPJl8kA/exec';

export default gasProxy(GAS_URL);

export const config = {
  path: '/api/submit-donation',
};
