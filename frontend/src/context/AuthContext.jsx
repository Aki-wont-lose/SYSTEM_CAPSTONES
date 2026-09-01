import { createContext, useState, useEffect } from 'react';
import { loginRequest, validateTokenRequest, setThemeRequest } from '../services/authService';
import { signInWithMicrosoftPopup, completeMicrosoftLogin } from '../services/microsoftAuthService';
import { signInWithGooglePopup, completeGoogleLogin } from '../services/googleAuthService';

export const AuthContext = createContext(null);

const persistSession = (newToken, userData) => {
  localStorage.setItem('simes_token', newToken);
  localStorage.setItem('simes_user', JSON.stringify(userData));
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('simes_token'));
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState(localStorage.getItem('simes_theme') || 'LIGHT');

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('simes_token');
      const storedUser = localStorage.getItem('simes_user');

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
          localStorage.removeItem('simes_token');
          localStorage.removeItem('simes_user');
        }
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

    persistSession(newToken, userData);
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

    persistSession(newToken, userData);
    setToken(newToken);
    setUser(userData);
    if (userData.theme) setThemeState(userData.theme);

    return userData;
  };

  // Same idea, using the student's real STI-issued Google account — offered
  // as an interim option while STI's Microsoft accounts are still pending.
  const loginWithGoogle = async () => {
    const idToken = await signInWithGooglePopup();
    const response = await completeGoogleLogin(idToken);
    const { token: newToken, user: userData } = response.data;

    persistSession(newToken, userData);
    setToken(newToken);
    setUser(userData);
    if (userData.theme) setThemeState(userData.theme);

    return userData;
  };

  const logout = () => {
    localStorage.removeItem('simes_token');
    localStorage.removeItem('simes_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedData) => {
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    localStorage.setItem('simes_user', JSON.stringify(newUser));
  };

  const toggleTheme = async () => {
    const nextTheme = theme === 'LIGHT' ? 'DARK' : 'LIGHT';
    setThemeState(nextTheme);
    // Keep simes_user in sync so refresh doesn't revert to old theme from parsedUser
    try {
      const storedUser = localStorage.getItem('simes_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        parsed.theme = nextTheme;
        localStorage.setItem('simes_user', JSON.stringify(parsed));
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
        loginWithGoogle,
        logout,
        updateUser,
        isAuthenticated: !!token,
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
