import appleSigninAuth from 'apple-signin-auth';

export const verifyAppleToken = async (identityToken) => {
  try {
    const { sub: appleUserId, email } = await appleSigninAuth.verifyIdToken(identityToken, {
      audience: 'com.podorukun.podorukunTrack', // Bundle ID aplikasi iOS Podorukun
      ignoreExpiration: false,
    });
    return { appleUserId, email };
  } catch (error) {
    console.error('Apple ID Token verification failed:', error);
    throw new Error('Verifikasi token Apple gagal: ' + error.message);
  }
};

import fs from 'fs';

const getClientSecret = () => {
  const privateKey = process.env.APPLE_PRIVATE_KEY_PATH 
    ? fs.readFileSync(process.env.APPLE_PRIVATE_KEY_PATH, 'utf8') 
    : process.env.APPLE_PRIVATE_KEY;
    
  if (!privateKey || !process.env.APPLE_TEAM_ID || !process.env.APPLE_KEY_ID) {
    console.warn('Apple Developer credentials missing in .env');
    return null;
  }

  return appleSigninAuth.getClientSecret({
    clientID: 'com.podorukun.podorukunTrack',
    teamID: process.env.APPLE_TEAM_ID,
    keyIdentifier: process.env.APPLE_KEY_ID,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  });
};

export const exchangeAppleToken = async (authorizationCode) => {
  try {
    const clientSecret = getClientSecret();
    if (!clientSecret) return null;

    const tokenResponse = await appleSigninAuth.getAuthorizationToken(authorizationCode, {
      clientID: 'com.podorukun.podorukunTrack',
      clientSecret: clientSecret,
    });
    return tokenResponse.refresh_token;
  } catch (error) {
    console.error('Apple Token Exchange failed:', error);
    return null;
  }
};

export const revokeAppleToken = async (refreshToken) => {
  try {
    const clientSecret = getClientSecret();
    if (!clientSecret) return false;

    const params = new URLSearchParams({
      client_id: 'com.podorukun.podorukunTrack',
      client_secret: clientSecret,
      token: refreshToken,
      token_type_hint: 'refresh_token'
    });
    
    const response = await fetch('https://appleid.apple.com/auth/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    
    if (!response.ok) {
      console.error('Apple Revoke API responded with:', response.statusText);
    }
    return response.ok;
  } catch (error) {
    console.error('Apple Token Revocation failed:', error);
    return false;
  }
};
