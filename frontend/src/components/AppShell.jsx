import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquareText, Store, LogOut, User as UserIcon } from "lucide-react";

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const doLogout = async () => {
    await logout();
    nav("/login");
  };

  return (
    <div className="flex h-screen w-screen">
      {/* Left rail */}
      <aside className="w-[72px] bg-[#111B21] border-r border-[#222D34] flex flex-col items-center py-4 gap-2 shrink-0">
        <div className="w-10 h-10 rounded-2xl bg-[#00A884] grid place-items-center mb-2">
          <MessageSquareText className="w-5 h-5 text-[#0B141A]" />
        </div>
        <RailLink to="/chat" icon={<MessageSquareText className="w-5 h-5" />} label="Chats" testId="nav-chat" />
        <RailLink to="/listings" icon={<Store className="w-5 h-5" />} label="Market" testId="nav-listings" />

        <div className="flex-1" />

        <NavLink to="/profile" className="w-10 h-10 rounded-full bg-[#00A884] grid place-items-center text-[#0B141A] font-bold text-sm hover:bg-[#008F70] transition-colors" data-testid="nav-profile">
          {user?.avatar ? (
            <img src={user.avatar} alt="me" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            (user?.username || "?").slice(0, 2).toUpperCase()
          )}
        </NavLink>
        <button
          onClick={doLogout}
          data-testid="logout-button"
          title="Logout"
          className="w-10 h-10 rounded-xl hover:bg-[#2A3942] grid place-items-center text-[#8696A0] hover:text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </aside>

      <main className="flex-1 min-w-0 flex"><Outlet /></main>
    </div>
  );
}

function RailLink({ to, icon, label, testId }) {
  return (
    <NavLink
      to={to}
      data-testid={testId}
      className={({ isActive }) =>
        `w-12 h-12 rounded-2xl grid place-items-center transition-all duration-200 relative group ${
          isActive
            ? "bg-[#2A3942] text-[#00A884]"
            : "text-[#8696A0] hover:bg-[#202C33] hover:text-[#E9EDEF]"
        }`
      }
    >
      {icon}
      <span className="absolute left-14 whitespace-nowrap text-xs bg-[#202C33] border border-[#222D34] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
        {label}
      </span>
    </NavLink>
  );
}
