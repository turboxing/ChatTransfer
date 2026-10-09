const express = require('express');
const router = express.Router();
const roomManager = require('../socket/session-manager');

router.get('/checkLogin', (req, res) => {
  res.send({
    code: 0,
    message: 'ok',
    data: {
      users: roomManager.listUsers()
    }
  });
});

module.exports = router;
