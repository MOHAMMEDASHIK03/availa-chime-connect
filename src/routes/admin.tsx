import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, LogOut, Save, Plus, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchContent, useContent, type Content, type Service } from "@/lib/content-store";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin · Glamupbykirthi" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const check = async (uid: string | null) => {
      if (!uid) { setIsAdmin(false); setLoading(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
      setIsAdmin(!!data);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null;
      setUserId(uid);
      check(uid);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user.id ?? null;
      setUserId(uid);
      setLoading(true);
      check(uid);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-background text-muted-foreground">Loading…</div>;
  }
  if (!userId) return <LoginScreen />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-5">
        <div className="max-w-md text-center glass rounded-3xl p-8 border border-border">
          <h1 className="font-display text-2xl mb-2">Not authorised</h1>
          <p className="text-sm text-muted-foreground mb-4">This account doesn't have admin access.</p>
          <button onClick={() => supabase.auth.signOut()} className="rounded-full border border-border px-5 py-2 text-sm hover:bg-secondary">Sign out</button>
        </div>
      </div>
    );
  }
  return <Dashboard onLogout={() => supabase.auth.signOut()} />;
}

function LoginScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setBusy(true);
    const fn = mode === "signin"
      ? supabase.auth.signInWithPassword({ email: email.trim(), password })
      : supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
    const { error } = await fn;
    setBusy(false);
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background px-5">
      <form onSubmit={submit} className="w-full max-w-md glass rounded-3xl p-8 shadow-luxe border border-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 rounded-2xl gradient-rose grid place-items-center text-black"><Lock className="h-5 w-5" /></div>
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-rose-gold">Admin</p>
            <h1 className="font-display text-2xl text-black">{mode === "signin" ? "Sign in" : "Create account"}</h1>
          </div>
        </div>
        <label className="block text-xs font-bold text-black mb-1.5">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-black mb-4 focus:outline-none focus:ring-2 focus:ring-rose-gold/50" />
        <label className="block text-xs font-bold text-black mb-1.5">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-black mb-4 focus:outline-none focus:ring-2 focus:ring-rose-gold/50" />
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <button type="submit" disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-full gradient-rose text-black px-5 py-3 text-sm shadow-soft hover:opacity-95 transition disabled:opacity-60">
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
        <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
          className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground">
          {mode === "signin" ? "First time? Create the admin account" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const live = useContent();
  const [draft, setDraft] = useState<Content>(live);
  const [savedAt, setSavedAt] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setDraft(live); }, [live]);

  const updateSvc = (cat: "makeup" | "hair", idx: number, patch: Partial<Service>) => {
    setDraft((d) => ({ ...d, [cat]: d[cat].map((s, i) => i === idx ? { ...s, ...patch } : s) }));
  };
  const removeSvc = (cat: "makeup" | "hair", idx: number) => {
    setDraft((d) => ({ ...d, [cat]: d[cat].filter((_, i) => i !== idx) }));
  };
  const addSvc = (cat: "makeup" | "hair") => {
    setDraft((d) => ({ ...d, [cat]: [...d[cat], { name: "New service", price: 100, img: "", desc: "" }] }));
  };

  const onFile = (cat: "makeup" | "hair", idx: number, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 900;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
        updateSvc(cat, idx, { img: dataUrl });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setBusy(true);
    try {
      // Fetch existing IDs to know what to delete
      const existing = await fetchContent();
      const existingIds = new Set<string>([...existing.makeup, ...existing.hair].map((s) => s.id!).filter(Boolean));
      const keptIds = new Set<string>([...draft.makeup, ...draft.hair].map((s) => s.id).filter(Boolean) as string[]);

      const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
      if (toDelete.length) {
        await supabase.from("services").delete().in("id", toDelete);
      }

      for (const cat of ["makeup", "hair"] as const) {
        for (let i = 0; i < draft[cat].length; i++) {
          const s = draft[cat][i];
          const row = { category: cat, name: s.name, price: s.price, img: s.img, description: s.desc, sort_order: i };
          if (s.id) {
            await supabase.from("services").update(row).eq("id", s.id);
          } else {
            await supabase.from("services").insert(row);
          }
        }
      }
      const fresh = await fetchContent();
      setDraft(fresh);
      setSavedAt(new Date().toLocaleTimeString("en-AU"));
    } catch (e) {
      console.error(e);
      alert("Could not save changes. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-black">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-rose-gold">Admin Dashboard</p>
            <h1 className="font-display font-bold text-2xl">Glamupbykirthi</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {savedAt && <span className="text-xs text-muted-foreground">Saved at {savedAt}</span>}
            <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-full gradient-rose text-black px-5 py-2 text-sm shadow-soft disabled:opacity-60">
              <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save changes"}
            </button>
            <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-12">
        <p className="text-sm text-muted-foreground">
          Edit service names, prices, descriptions and photos below, then click <strong>Save changes</strong>.
          Updates are stored securely in Lovable Cloud and appear live on the website for every visitor.
        </p>

        {(["makeup", "hair"] as const).map((cat) => (
          <section key={cat}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-2xl capitalize">{cat === "makeup" ? "Makeup Artistry" : "Hairstyling"}</h2>
              <button onClick={() => addSvc(cat)} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">
                <Plus className="h-4 w-4" /> Add service
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              {draft[cat].map((s, idx) => (
                <div key={s.id ?? `new-${idx}`} className="glass rounded-2xl p-5 border border-border space-y-3">
                  <div className="flex gap-4">
                    <div className="w-28 h-28 rounded-xl overflow-hidden bg-secondary shrink-0">
                      {s.img
                        ? <img src={s.img} alt={s.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">No image</div>}
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="block text-xs font-bold">Name</label>
                      <input value={s.name} onChange={(e) => updateSvc(cat, idx, { name: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                      <label className="block text-xs font-bold">Price (AUD $)</label>
                      <input type="number" min={0} value={s.price}
                        onChange={(e) => updateSvc(cat, idx, { price: Number(e.target.value) || 0 })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <label className="block text-xs font-bold">Description</label>
                  <textarea value={s.desc} rows={3}
                    onChange={(e) => updateSvc(cat, idx, { desc: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs cursor-pointer hover:bg-secondary">
                      <Upload className="h-3.5 w-3.5" /> Upload image
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(cat, idx, f); }} />
                    </label>
                    <input type="text" placeholder="…or paste image URL" value={s.img?.startsWith("data:") ? "" : s.img}
                      onChange={(e) => updateSvc(cat, idx, { img: e.target.value })}
                      className="flex-1 min-w-[160px] rounded-lg border border-border bg-background px-3 py-2 text-xs" />
                    <button onClick={() => removeSvc(cat, idx)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
