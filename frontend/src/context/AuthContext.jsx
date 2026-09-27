import { createContext, useState, useEffect } from 'react';
import { loginRequest, validateTokenRequest, setThemeRequest, changePasswordRequest } from '../services/authService';
import { signInWithMicrosoftPopup, completeMicrosoftLogin } from '../services/microsoftAuthService';
import { SESSION_TOKEN_KEY, SESSION_USER_KEY, getToken, getStoredUser, saveSession, saveStoredUser, clearSession } from '../services/session';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => getToken());
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState(localStorage.getItem('simes_theme') || 'LIGHT');

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getToken();
      const storedUser = getStoredUser();

      if (storedToken && storedUser) {
        try {
          await validateTokenRequest(storedToken);
          setToken(storedToken);
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          // Prefer saved simes_theme (user's last toggle) over DB value to avoid flash to dark on refresh
          const savedTheme = localStorage.getItem('simes_theme');
          if (savedTheme) setThemeState(savedTheme);
          else if (parsedUser.theme) setThemeState(parsedUser.theme);
        } catch (error) {
          clearSession();
        }
      } else {
        // No session for this tab: make sure a stale browser-wide session is not left behind
        localStorage.removeItem(SESSION_TOKEN_KEY);
        localStorage.removeItem(SESSION_USER_KEY);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'DARK') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('simes_theme', theme);
  }, [theme]);

  // Direct email + password login — no OTP step.
  const login = async (email, password) => {
    const response = await loginRequest(email, password);
    const { token: newToken, user: userData } = response.data;

    saveSession(newToken, userData);
    setToken(newToken);
    setUser(userData);
    if (userData.theme) setThemeState(userData.theme);

    return userData;
  };

  // Microsoft popup handles password + any school MFA itself; on success we
  // exchange its ID token for our own session in one step.
  const loginWithMicrosoft = async () => {
    const idToken = await signInWithMicrosoftPopup();
    const response = await completeMicrosoftLogin(idToken);
    const { token: newToken, user: userData } = response.data;

    saveSession(newToken, userData);
    setToken(newToken);
    setUser(userData);
    if (userData.theme) setThemeState(userData.theme);

    return userData;
  };

  const logout = () => {
    clearSession();
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    saveStoredUser(newUser);
  };

  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    const response = await changePasswordRequest(currentPassword, newPassword, confirmPassword);
    updateUser({ mustChangePassword: false });
    return response;
  };

  const toggleTheme = async () => {
    const nextTheme = theme === 'LIGHT' ? 'DARK' : 'LIGHT';
    setThemeState(nextTheme);
    // Keep simes_user in sync so refresh doesn't revert to old theme from parsedUser
    try {
      const storedUser = getStoredUser();
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        parsed.theme = nextTheme;
        saveStoredUser(parsed);
        setUser(parsed);
      }
    } catch {}
    if (token) {
      try {
        await setThemeRequest(nextTheme);
      } catch (e) {
        // non-critical — theme still applies locally even if the save fails
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        theme,
        toggleTheme,
        login,
        loginWithMicrosoft,
        logout,
        updateUser,
        changePassword,
        isAuthenticated: !!token,
        mustChangePassword: !!user?.mustChangePassword,
        isAdmin: user?.role === 'ADMIN',
        isCoordinator: user?.role === 'COORDINATOR',
        isSupervisor: user?.role === 'SUPERVISOR',
        isStudent: user?.role === 'STUDENT',
        roleHome: user?.role === 'ADMIN' ? '/admin/dashboard' : user?.role === 'COORDINATOR' ? '/coordinator/dashboard' : user?.role === 'SUPERVISOR' ? '/supervisor/dashboard' : '/dashboard',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
