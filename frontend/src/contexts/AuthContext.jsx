import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState({ mapboxToken: "", cloudinaryConfigured: false });

  const refresh = useCallback(async () => {
    try {
      const [{ data: me }, { data: cfg }] = await Promise.all([
        api.get("/auth/me"),
        api.get("/config"),
      ]);
      setUser(me.user);
      setConfig(cfg);
    } catch (_) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (username, password) => {
    const { data } = await api.post("/auth/login", { username, password });
    setUser(data.user);
    return data.user;
  };
  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    setUser(data.user);
    return data.user;
  };
  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, setUser, loading, login, register, logout, config, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
