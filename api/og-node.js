// api/og.js uses @vercel/og (Vercel edge-only ESM).
// On Oracle/Node.js, serve the static social preview image instead.
module.exports = function handler(req, res) {
  res.writeHead(302, { Location: '/assets/social-preview.png' });
  res.end();
};
