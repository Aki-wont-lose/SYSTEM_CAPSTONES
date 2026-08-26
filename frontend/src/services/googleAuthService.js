import api from './api';

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
export const isGoogleLoginEnabled = !!GOOGLE_CLIENT_ID;

let scriptLoadPromise = null;

// Loads Google's own Identity Services script on demand (not bundled),
// keeping this free feature from adding to the app's JS bundle size.
const loadGoogleScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Sign-In script'));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
};

// Called directly from our own "Sign in with Google" button's onClick —
// staying inside that real click handler (rather than a setTimeout or
// promise chain) is what keeps the resulting popup from being blocked as
// an unrequested popup by the browser.
export const signInWithGooglePopup = () =>
  new Promise(async (resolve, reject) => {
    try {
      await loadGoogleScript();
    } catch (err) {
      return reject(err);
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (response?.credential) {
          resolve(response.credential);
        } else {
          reject(new Error('Google sign-in was cancelled'));
        }
      },
      use_fedcm_for_prompt: true,
    });

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        reject(new Error('Google sign-in could not be shown. Please allow third-party cookies/popups for this site and try again.'));
      }
    });
  });

// Sends the Google ID token to our backend, which verifies it and returns
// our own SIMES session JWT.
export const completeGoogleLogin = async (idToken) => {
  const response = await api.post('/auth/google', { idToken });
  return response.data;
};
