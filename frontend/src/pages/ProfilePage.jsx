import { useState } from "react";
import { Check, Loader2, User } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ bio: user?.bio || "", avatar: user?.avatar || "" });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setSaved(false);
    setError("");
    try {
      const { data } = await api.put("/auth/me", form);
      setUser(data.user);
      setSaved(true);
    } catch (requestError) {
      setError(requestError?.response?.data?.error || "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto wispr-doodle-bg p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6" style={{ fontFamily: "Outfit" }}>Profile</h1>
        <section className="bg-[#202C33] border border-[#222D34] rounded-2xl p-6" data-testid="profile-panel">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-[#00A884] text-[#0B141A] grid place-items-center font-bold text-xl">
              {user?.avatar ? <img src={user.avatar} alt="" className="w-16 h-16 rounded-full object-cover" /> : <User className="w-7 h-7" />}
            </div>
            <div>
              <h2 className="text-xl font-semibold">@{user?.username}</h2>
              <p className="text-sm text-[#8696A0]">{user?.email}</p>
            </div>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-[#8696A0] mb-2 inline-block">Avatar URL</span>
              <input
                data-testid="profile-avatar-input"
                value={form.avatar}
                onChange={(event) => setForm({ ...form, avatar: event.target.value })}
                type="url"
                placeholder="https://..."
                className="w-full bg-[#0B141A] border border-[#222D34] focus:border-[#00A884] rounded-xl px-3 h-11 outline-none text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-[#8696A0] mb-2 inline-block">Bio</span>
              <textarea
                data-testid="profile-bio-input"
                value={form.bio}
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
                maxLength={240}
                rows={4}
                className="w-full bg-[#0B141A] border border-[#222D34] focus:border-[#00A884] rounded-xl px-3 py-2 outline-none text-sm resize-y"
              />
            </label>
            {error && <p className="text-sm text-red-400" data-testid="profile-error">{error}</p>}
            <div className="flex items-center justify-end gap-3">
              {saved && <span className="text-sm text-[#25D366] flex items-center gap-1"><Check className="w-4 h-4" /> Saved</span>}
              <button
                type="submit"
                disabled={busy}
                data-testid="profile-save-button"
                className="h-10 px-4 rounded-xl bg-[#00A884] hover:bg-[#008F70] text-[#0B141A] font-semibold flex items-center gap-2 disabled:opacity-60"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save profile
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}