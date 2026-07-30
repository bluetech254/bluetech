"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Mail, Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@bluetech.co.ke");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => router.push("/"), 500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-volt flex items-center justify-center">
            <Zap size={20} className="text-white" fill="white" />
          </div>
          <div className="leading-tight text-left">
            <div className="font-bold text-base tracking-tight">BlueTech</div>
            <div className="text-[11px] text-ink-dim -mt-0.5">Kenya Admin</div>
          </div>
        </div>

        <div className="card p-7">
          <h1 className="text-lg font-semibold mb-1">Sign in to the console</h1>
          <p className="text-sm text-ink-dim mb-6">Admin and superadmin access only.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-ink-dim mb-1.5 block">Email</label>
              <div className="flex items-center gap-2 input-field">
                <Mail size={14} className="text-ink-dim" />
                <input type="email" required className="bg-transparent outline-none w-full text-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-ink-dim mb-1.5 block">Password</label>
              <div className="flex items-center gap-2 input-field">
                <Lock size={14} className="text-ink-dim" />
                <input type="password" required placeholder="••••••••" className="bg-transparent outline-none w-full text-sm" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary justify-center mt-2">
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
        <p className="text-xs text-ink-dim text-center mt-5">Sessions last 8 hours and auto-extend with activity.</p>
      </div>
    </div>
  );
}
