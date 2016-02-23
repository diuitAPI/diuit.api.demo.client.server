# diuit.api.sample.client.server

# Authenticating User

In order to let a user send and receive messages, you must authenticate them first. Diuit will accept any unique string as a User ID (UIDs, email addresses, phone numbers, usernames, etc), so you can use any new or existing User Management system.  

Our messaging server does not directly store your users’ credential. Instead, you will need to have your own account server to manager your users’ credentials and to authenticate them for our messaging server.  

After you’ve authenticated your user, you then encrypt a JWT token using the **Encryption Key** obtained from us when you signed up for your account.  

The JWT contains a grant telling us which user is allowed access to the messaging server and how long the grant is effective.  

Thus, authenticating a user on our messaging server is a 4-step process.  

The following description is RESTful by natural, so we do not need to provide SDK APIs for the following calls.  


1. Obtain a random **nonce** from our messaging server through `/1/auth/nonce` API.
This nonce is used to prevent replay attack on our messaging server, and prevent the
nonce being leaked to a malicious user.

    Note that this step can be performed either by your messaging clients or by your account server, which depends on your system architecture.

2. With the nonce at hand, you authenticate your client on your account server using whatever method you like.

    If the authentication is successful, your account server will create a JWT authentication token granting the authenticated user who accesses to our messaging server.

3. You should then call our `/1/auth/login` API using the JWT token as the parameter
to obtain a **session token**.

    Note that this step can also be done either on your messaging clients side or on your account server, which depends on your system architecture.

4. With the session token on hand, the messaging client will use it as the
value for the **X-Diuit-Session-Token** header** for all future API calls that
requires a specific user session.

    Please note that the **Encryption Key** should be kept private on your account server, and should not be stored on your client devices, unless you have security measures ensuring that the key can be kept secret. (For Android / iOS clients, this is impossible. There are many ways of rooting devices, and storing your encryption key at iOS/Android client devices will make your system vulnerable to attack.)

    If you suspect that your encryption key has been compromised, please reissue a new one on [https://api.diuit.net](https://api.diuit.net) and revoke the old key.

### 1. Obtaining Authentication Nonce

The first step of authentication requires you to obtain a random nonce from our messaging server. This nonce is used to prevent replay-attack of the JWT token.

To obtain the nonce from our server, send a GET request to the `/1/auth/nonce` endpoint.

```shell
curl -X GET \
  -H "x-diuit-application-id: ${DIUIT_APP_ID}" \
  -H "x-diuit-api-key: ${DIUIT_APP_KEY}" \
  https://api.diuit.net/1/auth/nonce
```

The response body is a JSON object containing the `nonce` key.

<aside class="note">
    {
      "nonce": "123asdf123asdf12321adf",
    }
</aside>

### 2. Authenticate User On Your Account Server

The actual user authentication is performed on your own server. Performing any authentication check you’ve implemented to authenticate the user who logs in.

### 3. Generate JWT Token

If the user’s identity is verified, your server will generate a JWT token with the following header:

<aside class="note">
    {
      "typ": "JWT",
      "alg": "RS256"
      "cty": "diuit-eit;v=1"
      "kid": ${EncryptionKeyId}
    }
</aside>

...and with the following claim body:

<aside class="note">
    {
      "iss": ${DIUIT_APP_ID}
      "sub": ${UNIQUE_USER_ID}
      "iat": ${CURRENT_TIME_IN_ISO8601_FORMAT}
      "exp": ${SESSION_EXPIRATION_TIME_IN_ISO8601_FORMAT}
      "nce": ${AUTHENTICATION_NONCE}
    }
</aside>

...  then encrypt the whole thing with your **Encryption Key** obtained when registering for your account.

Note that you can put anything in the "sub" field, as long as you can co-relate this to the user on your system. Our messaging server will use this field to identify this user.

In the "exp" field, you can specify when this grant will be expired. This field controls for how long the session token generated in the next step will be valid.

Setting this to a relative short value makes the system more secure; leaking a session token will have limited damage. But the drawback is that you will have to re-authenticate your users every so often.

Setting this to a long value can also be useful for Internet of Things (IoT) applications, because you are very confident that the device will not be hacked. You can pre-generate your session token, and set a extremely long expiration date to effectively make the device always authenticated. But in this case, you will have to ensure that the session token is never leaked. (The session token will essentially behaves like a randomly generated password in this case).

In the "kid" field, note to put Encryption Key ID, not **Encryption Key** itself. The JWT header itself is not encrypted, so never put any private data in the JWT header.
The JWT header itself is not encrypted, so never put any private data in the
JWT header.

### 4. Login to Messaging Server

With the JWT token generated, you then POST to the `/1/auth/login` API with the **auth-token** parameter set to the JWT token to obtain a session token for the user.

This step can be done either on the server side or client side. It depends on your own system architecture. But please note that when logging in, you will also need to provide the **deviceId** field to uniquely identify the current device that the user is logging in.

If you are using a web platform, please generate a unique UUID to link with the current web session. (And possibly store the UUID in local storage / cookie).

If your wish to enable push notification on mobile devices, please pass two additional fields: **platform** to indicate what is the push platform to be used (valid values are one of "gcm", "ios_sandbox", "ios_production"), and **pushToken** field to indicate the pushToken specific to the push platform.



```shell
curl -X POST \
  -H "x-diuit-application-id: ${DIUIT_APP_ID}" \
  -H "x-diuit-api-key: ${DIUIT_APP_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"authToken":${JWT_TOKEN}, "deviceId": ${DEVICE_ID}, "platform": ${PUSH_PLATFORM}, "pushToken": ${PUSH_TOKEN}' \
  https://api.diuit.net/1/auth/login
```

If successful, the response will be a JSON object contains the `session` key that should be set in future API calls as `x-diuit-session-token` header to authenticate the user.

<aside class="note">
    {
      "session": "123asdf123asdf12321adf",
      "userId": ${USER_ID}
      "deviceId": ${DEVICE_ID}
    }
</aside>

