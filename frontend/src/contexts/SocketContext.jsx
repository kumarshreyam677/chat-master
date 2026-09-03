import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { BACKEND_URL } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const SocketCtx = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [presence, setPresence] = useState({}); // userId -> { online, lastSeen }

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      return;
    }
    const s = io(BACKEND_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    socketRef.current = s;
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("presence:update", ({ userId, online, lastSeen }) => {
      setPresence((p) => ({ ...p, [userId]: { online, lastSeen } }));
    });
    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  return (
    <SocketCtx.Provider value={{ socket: socketRef.current, connected, presence, setPresence }}>
      {children}
    </SocketCtx.Provider>
  );
}

export const useSocket = () => useContext(SocketCtx);
