// Session storage lives here so the auth context and the axios instance can both use it
// without an import cycle. sessionStorage is intentional: it survives page refreshes but is
// discarded when the tab/window is closed, so closing the browser signs the user out.
export const SESSION_TOKEN_KEY = 'simes_token';
export const SESSION_USER_KEY = 'simes_user';

export const getToken = () => sessionStorage.getItem(SESSION_TOKEN_KEY);

export const getStoredUser = () => sessionStorage.getItem(SESSION_USER_KEY);

export const saveSession = (token, user) => {
  sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
};

export const saveStoredUser = (user) => {
  sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  sessionStorage.removeItem(SESSION_USER_KEY);
  // Remove any browser-wide leftovers from the old localStorage behaviour
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_USER_KEY);
};
