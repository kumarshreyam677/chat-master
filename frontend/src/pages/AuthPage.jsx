import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquareText, Loader2, User, Lock, Mail, Sparkles } from "lucide-react";

export default function AuthPage({ mode = "login" }) {
  const nav = useNavigate();
  const { login, register } = useAuth();
  const isLogin = mode === "login";
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      if (isLogin) await login(form.username, form.password);
      else await register(form);
      nav("/chat");
    } catch (e) {
      setErr(e?.response?.data?.error || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-stretch wispr-doodle-bg">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-14 relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#00A884] grid place-items-center shadow-lg shadow-emerald-500/20">
            <MessageSquareText className="w-6 h-6 text-[#0B141A]" />
          </div>
          <div>
            <div className="font-extrabold text-2xl tracking-tight" style={{ fontFamily: "Outfit" }}>Wispr</div>
            <div className="text-xs text-[#8696A0] uppercase tracking-widest">chat · marketplace</div>
          </div>
        </div>

        <div className="max-w-lg">
          <h1 className="text-5xl font-extrabold leading-tight" style={{ fontFamily: "Outfit" }}>
            Real-time chat.<br />
            <span className="text-[#00A884]">Real places to stay.</span>
          </h1>
          <p className="mt-5 text-[#8696A0] text-lg leading-relaxed">
            Message anyone instantly, browse a curated marketplace of stays with beautiful photos and a live map. All in one whisper-quiet workspace.
          </p>
          <div className="mt-8 flex items-center gap-3 text-sm text-[#8696A0]">
            <Sparkles className="w-4 h-4 text-[#25D366]" />
            <span>Socket.io · Passport · MongoDB · Mapbox · Cloudinary</span>
          </div>
        </div>

        <div className="text-xs text-[#8696A0]">© 2026 Wispr Labs · Built with love</div>
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <form
          onSubmit={submit}
          className="w-full max-w-md wispr-glass rounded-3xl p-8 shadow-2xl"
          data-testid={isLogin ? "login-form" : "register-form"}
        >
          <div className="mb-8">
            <h2 className="text-3xl font-bold" style={{ fontFamily: "Outfit" }}>
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-[#8696A0] mt-2">
              {isLogin ? "Sign in to continue to Wispr." : "Join the conversation in seconds."}
            </p>
          </div>

          {!isLogin && (
            <Field
              icon={<Mail className="w-4 h-4" />}
              label="Email"
              type="email"
              testId="register-email-input"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              required
            />
          )}
          <Field
            icon={<User className="w-4 h-4" />}
            label="Username"
            testId={isLogin ? "login-username-input" : "register-username-input"}
            value={form.username}
            onChange={(v) => setForm({ ...form, username: v })}
            required
          />
          <Field
            icon={<Lock className="w-4 h-4" />}
            label="Password"
            type="password"
            testId={isLogin ? "login-password-input" : "register-password-input"}
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
            required
          />

          {err && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2 mb-4" data-testid="auth-error">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            data-testid={isLogin ? "login-submit-button" : "register-submit-button"}
            className="w-full h-11 rounded-xl bg-[#00A884] hover:bg-[#008F70] transition-all duration-200 font-semibold text-[#0B141A] flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLogin ? "Sign in" : "Create account"}
          </button>

          <div className="mt-6 text-center text-sm text-[#8696A0]">
            {isLogin ? (
              <>New here? <Link to="/register" className="text-[#00A884] hover:underline" data-testid="switch-to-register">Create an account</Link></>
            ) : (
              <>Already have an account? <Link to="/login" className="text-[#00A884] hover:underline" data-testid="switch-to-login">Sign in</Link></>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ icon, label, type = "text", value, onChange, required, testId }) {
  return (
    <label className="block mb-4">
      <span className="text-xs uppercase tracking-widest text-[#8696A0] mb-2 inline-block">{label}</span>
      <div className="flex items-center gap-2 bg-[#0B141A] border border-[#222D34] focus-within:border-[#00A884] rounded-xl px-3 h-11 transition-colors">
        <span className="text-[#8696A0]">{icon}</span>
        <input
          data-testid={testId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="flex-1 bg-transparent outline-none text-[#E9EDEF] placeholder:text-[#54636B]"
          placeholder={label}
        />
      </div>
    </label>
  );
}
