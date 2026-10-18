function getRequestBaseUrl(req) {
  const publicUrl = process.env.CHATTRANSFER_PUBLIC_URL;

  if (publicUrl) {
    return publicUrl.replace(/\/$/, '');
  }

  const forwardedProtocol = req.headers['x-forwarded-proto'];
  const protocol = forwardedProtocol || req.protocol;
  return `${protocol}://${req.headers.host}`;
}

module.exports = {
  getRequestBaseUrl
};
