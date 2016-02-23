var _ = require('lodash');
var express = require('express');
var models = require('../models') // holds in memory version of user/devices table
var router = express.Router();
var promise = require('bluebird');
var rp = require('request-promise');
var jws = require('jws');
var moment = require('moment');

var client = {
  appId: "PUT_YOUR_DIUIT_APP_ID",
  apiKey: "PUT_YOUR_DIUIT_APP_KEY",
  encryptionKeyId: 'PUT_ENCRYPTION_KEY_ID', // this id points to the private key belong in our database
  encryptionKey: 'PUT_ENCRYPTION_KEY'  // this key is private, please don't ever send this key over internet
};

// simulate user login
router.post('/login', function(req, res, next) {

  var username = req.body.username;
  var password = req.body.password;
  var deviceId = req.body.deviceId;
  var devicePlatform = req.body.platform;

  var opts = {username: username, password: password};
  var user = _.find(models.users, {username: username, password: password})
  console.log(opts)
  console.log(models.users);
  if (!user) {
    res.status(401).end();
    return
  }

  var headers = {
      "x-diuit-application-id": client.appId,
      "x-diuit-api-key": client.apiKey
  };

  rp({ // first, get server nonce
    method: 'GET',
    uri: 'https://api.diuit.net/1/auth/nonce',
    headers: headers,
    json: true
  }).then(function(resp) {

    return rp({ // then, create a jwt certificate with the subject information
      method: 'POST',
      uri: 'https://api.diuit.net/1/auth/login',
      headers: headers,
      body: {
        jwt: jws.sign({
          header: {
            typ: 'JWT', // the payload is JWT format
            alg: 'RS256', // sign using rs256 algorithm
            cty: 'diuit-auth;v=1', // content type, use our diuit-auth entication content-type, version 1
            kid: client.encryptionKeyId  // which key is used for encryption (you can have multiple keys, this is for server to know which key to use to decrypt this certificate)
          },
          payload: {
            iss: client.appId, // issuer, who issue this certificate, in this case, the client yourself
            sub: user.id, // subject, who is granted access in this certificate, in this case, the user who is trying to login
            iat: moment().format(), // issue at, when the certificate is issued at
            exp: moment().add({weeks: 1}).format(), // expired, when the certification will expire
            nonce: resp.nonce // nonce, the server nonce, to prevent replay attack
          },
          privateKey: client.encryptionKey // the key used for encrypting the certificate
        }),
        deviceId: deviceId, // when login, also need to provide the device that is loggining in
        platform: devicePlatform //
      },
      json: true
    });
  }).then(function(resp) {
    console.log(resp); // response will have a session token
    res.status(200).json({status: 'ok', session: resp.session});
  }).catch(function(err) {
    console.log(err)
    res.status(500).end();
  });
});

module.exports = router;
