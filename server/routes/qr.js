const express = require('express');
const { geneQR } = require('../tool');
const router = express.Router();

router.get('/geneQR', (req, res) => {
  const content = req.query.qrStr;
  const qrImage = geneQR(content);

  res.send({
    code: qrImage ? 0 : -1,
    message: qrImage ? 'ok' : 'failed',
    data: qrImage ? { qr: qrImage, qrText: content } : {}
  });
});

router.get('/geneBUserQR', (req, res) => {
  res.send({ code: 0, message: 'ok' });
});

router.get('/getIndexInfo', (req, res) => {
  const homeUrl = `${req.protocol}://${req.headers.host}`;
  const aUrl = `${homeUrl}/chat?sender=A&receiver=B`;
  const bUrl = `${homeUrl}/chat?sender=B&receiver=A`;

  res.send({
    code: 0,
    message: 'ok',
    data: {
      lists: [
        { qrurl: geneQR(aUrl), jupmUrl: aUrl },
        { qrurl: geneQR(bUrl), jupmUrl: bUrl }
      ]
    }
  });
});

router.get('/getIndexInfo2', (req, res) => {
  const homeUrl = `${req.protocol}://${req.headers.host}`;
  const loginUrl = `${homeUrl}/login?receiver=${req.query.receiver || 'group_chat'}`;

  res.send({
    code: 0,
    message: 'ok',
    data: {
      lists: [{ qrurl: geneQR(loginUrl), jupmUrl: loginUrl }]
    }
  });
});

router.get('/scanLogin', (req, res) => {
  const homeUrl = `${req.protocol}://${req.headers.host}`;
  const receiver = req.query.receiver || 'group_chat';
  const targetUrl = `${homeUrl}/chat?sender=${req.query.sender}&receiver=${receiver}`;

  res.send({
    code: 0,
    message: 'ok',
    data: { targetUrl }
  });
});

module.exports = router;
