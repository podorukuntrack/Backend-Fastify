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
