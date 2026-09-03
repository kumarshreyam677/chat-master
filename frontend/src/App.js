import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import AppShell from "@/components/AppShell";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthPage from "@/pages/AuthPage";
import ChatPage from "@/pages/ChatPage";
import ListingsPage from "@/pages/ListingsPage";
import ListingDetailPage from "@/pages/ListingDetailPage";
import ProfilePage from "@/pages/ProfilePage";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<ChatPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/listings" element={<ListingsPage />} />
              <Route path="/listings/:id" element={<ListingDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default function AppWithProviders() {
  return (
    <AuthProvider>
      <SocketProvider>
        <App />
      </SocketProvider>
    </AuthProvider>
  );
}


