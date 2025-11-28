// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api.js";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// Check if JWT expired (Decodes exp timestamp)
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  /* --------------------------------------------------
     LOAD USER ON PAGE REFRESH
  ---------------------------------------------------*/
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || isTokenExpired(token)) {
      logout();
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const res = await api.get("/auth/profile");

        const profile = {
          _id: res.data._id,
          name: res.data.name,
          email: res.data.email,
          avatar: res.data.avatar,
          theme: res.data.theme,
          token,
        };

        localStorage.setItem("user", JSON.stringify(profile));
        setUser(profile);
      } catch (error) {
        console.warn("⚠️ Profile fetch failed:", error.message);
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  /* --------------------------------------------------
     LOGIN — FIXED (NOW SENDS JSON HEADERS)
  ---------------------------------------------------*/
  const login = async (email, password) => {
    const res = await api.post(
      "/auth/login",
      { email, password },
      {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      }
    );

    const token = res.data.token;
    const data = {
      _id: res.data._id,
      name: res.data.name,
      email: res.data.email,
      avatar: res.data.avatar,
      theme: res.data.theme,
      token,
    };

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(data));
    setUser(data);
    return data;
  };

  /* --------------------------------------------------
     REGISTER — WITH JSON HEADERS
  ---------------------------------------------------*/
  const register = async (name, email, password) => {
    const res = await api.post(
      "/auth/register",
      { name, email, password },
      {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      }
    );

    const token = res.data.token;
    const data = {
      _id: res.data._id,
      name: res.data.name,
      email: res.data.email,
      avatar: res.data.avatar,
      theme: res.data.theme,
      token,
    };

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(data));
    setUser(data);
    return data;
  };

  /* --------------------------------------------------
     LOGOUT
  ---------------------------------------------------*/
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        setUser,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
