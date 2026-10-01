/* Route Command — Credit Submission Proxy
 * After deploying CreditCode.gs as a Google Apps Script web app,
 * paste the web app URL below to replace the placeholder.
 */
import { gasProxy } from './_gasProxy.mjs';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxfH_RppeXQvr6-lQdYq-PGU0wHd_QUErfxB4MukNz9kaDFSFb9z3juHmVqM2C_eqQM/exec';

export default gasProxy(GAS_URL);

export const config = {
  path: '/api/submit-credit',
};
