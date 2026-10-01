import { gasProxy } from './_gasProxy.mjs';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbybD1lYj0K_h4hSy8yMu0SopTKAryFpPH-5ILl-LfM_-82xRWb7A_z-WQxiUr1qHdOQeQ/exec';

export default gasProxy(GAS_URL);

export const config = {
  path: '/api/submit-receipt',
};
