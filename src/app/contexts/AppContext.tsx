import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiClient } from "../lib/apiClient";

export type Role = "student" | "teacher" | "admin" | "parent";

export interface AppUser {
  id: number;
  email: string;
  role: Role;
  first_name: string;
  last_name: string;
}

interface AppContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
  user: AppUser | null;
  isLoggedIn: boolean;
  login: (token: string, user: AppUser) => void;
  logout: () => void;
  settings: Record<string, string> | null;
  updateSettings: (newSettings: Record<string, string>) => void;
  updateUser: (userData: Partial<AppUser>) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("aa-theme") as "light" | "dark") || "dark";
  });
  
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("aa-theme", theme);
  }, [theme]);

  // Check token on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      apiClient.get("/users/me")
        .then(data => {
          setUser(data.user);
          setIsLoggedIn(true);
          return apiClient.get("/admin/settings");
        })
        .then((res: any) => {
          if (res && res.success) {
            setSettings(res.settings);
          }
        })
        .catch(() => {
          // Token invalid or expired
          localStorage.removeItem("token");
          setIsLoggedIn(false);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const login = (token: string, userData: AppUser) => {
    localStorage.setItem("token", token);
    setUser(userData);
    setIsLoggedIn(true);
    apiClient.get("/admin/settings")
      .then((res: any) => {
        if (res && res.success) {
          setSettings(res.settings);
        }
      })
      .catch(err => console.error("Error loading settings on login", err));
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setIsLoggedIn(false);
    setSettings(null);
  };

  const updateSettings = (newSettings: Record<string, string>) => {
    setSettings(newSettings);
  };

  const updateUser = (userData: Partial<AppUser>) => {
    setUser(prev => prev ? { ...prev, ...userData } : null);
  };

  if (loading) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>;
  }

  return (
    <AppContext.Provider value={{ theme, toggleTheme, user, isLoggedIn, login, logout, settings, updateSettings, updateUser }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
