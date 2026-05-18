import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, LogOut, Save, Plus, Trash2, Upload, Check, X as XIcon, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchContent, useContent, useGallery, type Content, type Service, type GalleryImage } from "@/lib/content-store";
import { uploadSiteImage } from "@/lib/storage";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin · Glamupbykirthi" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Booking = {
  id: string;
  customer_name: string;
  phone: string;
  services: { name: string; price: number }[];
  total_amount: number;
  booking_date: string;
  booking_time: string;
  location_type: "studio" | "home";
  address: string;
  status: "pending" | "confirmed" | "declined";
  admin_note: string;
  created_at: string;
};

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

  if (loading) return <div className="min-h-screen grid place-items-center bg-background text-muted-foreground">Loading…</div>;
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
  const [tab, setTab] = useState<"services" | "gallery" | "bookings">("bookings");
  return (
    <div className="min-h-screen bg-background text-black">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-rose-gold">Admin Dashboard</p>
            <h1 className="font-display font-bold text-2xl">Glamupbykirthi</h1>
          </div>
          <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
        <div className="max-w-6xl mx-auto px-5 pb-3 flex gap-2">
          {(["bookings", "services", "gallery"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-sm capitalize ${tab === t ? "gradient-rose text-black shadow-soft" : "border border-border hover:bg-secondary"}`}>
              {t}
            </button>
          ))}
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-5 py-8">
        {tab === "bookings" && <BookingsPanel />}
        {tab === "services" && <ServicesPanel />}
        {tab === "gallery" && <GalleryPanel />}
      </main>
    </div>
  );
}

// ===== BOOKINGS =====
function BookingsPanel() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "declined">("pending");

  const load = async () => {
    const { data } = await supabase.from("bookings").select("*").order("created_at", { ascending: false });
    setBookings((data ?? []) as Booking[]);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("admin-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const setStatus = async (id: string, status: "confirmed" | "declined") => {
    await supabase.from("bookings").update({ status }).eq("id", id);
  };

  const shown = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl">Bookings <span className="text-sm text-muted-foreground">({bookings.length})</span></h2>
        <div className="flex gap-2">
          {(["pending", "confirmed", "declined", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs capitalize ${filter === f ? "bg-black text-white" : "border border-border hover:bg-secondary"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bookings here yet.</p>
      ) : (
        <div className="grid gap-4">
          {shown.map((b) => (
            <div key={b.id} className="glass rounded-2xl p-5 border border-border">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full ${
                      b.status === "pending" ? "bg-amber-100 text-amber-800" :
                      b.status === "confirmed" ? "bg-green-100 text-green-800" :
                      "bg-red-100 text-red-800"
                    }`}>{b.status}</span>
                    <span className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString("en-AU")}</span>
                  </div>
                  <p className="font-display text-lg mt-2">{b.booking_date} · {b.booking_time}</p>
                  <p className="text-sm text-muted-foreground">
                    Phone: <a href={`tel:${b.phone}`} className="underline">{b.phone}</a>
                    {" · "}
                    <a href={`https://wa.me/${b.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp</a>
                  </p>
                  <p className="text-sm mt-1">{b.location_type === "studio" ? "At the studio" : `Home service — ${b.address}`}</p>
                  <ul className="mt-3 text-sm space-y-0.5">
                    {b.services.map((s, i) => <li key={i}>• {s.name} — AUD ${s.price}</li>)}
                  </ul>
                  <p className="font-bold mt-2">Total: AUD ${b.total_amount}</p>
                </div>
                {b.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => setStatus(b.id, "confirmed")}
                      className="inline-flex items-center gap-1.5 rounded-full bg-green-600 text-white px-4 py-2 text-sm hover:bg-green-700">
                      <Check className="h-4 w-4" /> Confirm
                    </button>
                    <button onClick={() => setStatus(b.id, "declined")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-red-600 text-red-600 px-4 py-2 text-sm hover:bg-red-50">
                      <XIcon className="h-4 w-4" /> Decline
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== SERVICES =====
function ServicesPanel() {
  const live = useContent();
  const [draft, setDraft] = useState<Content>(live);
  const [savedAt, setSavedAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Only adopt live data when we have no unsaved changes (fixes Add Service bug).
  useEffect(() => { if (!dirty) setDraft(live); }, [live, dirty]);

  const markDirty = (next: Content) => { setDirty(true); setDraft(next); };

  const updateSvc = (cat: "makeup" | "hair", idx: number, patch: Partial<Service>) =>
    markDirty({ ...draft, [cat]: draft[cat].map((s, i) => i === idx ? { ...s, ...patch } : s) });
  const removeSvc = (cat: "makeup" | "hair", idx: number) =>
    markDirty({ ...draft, [cat]: draft[cat].filter((_, i) => i !== idx) });
  const addSvc = (cat: "makeup" | "hair") =>
    markDirty({ ...draft, [cat]: [...draft[cat], { name: "New service", price: 100, img: "", desc: "" }] });

  const onFile = async (cat: "makeup" | "hair", idx: number, file: File) => {
    try {
      const url = await uploadSiteImage(file, "services");
      updateSvc(cat, idx, { img: url });
    } catch (e: any) {
      alert("Upload failed: " + (e.message || e));
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const existing = await fetchContent();
      const existingIds = new Set<string>([...existing.makeup, ...existing.hair].map((s) => s.id!).filter(Boolean));
      const keptIds = new Set<string>([...draft.makeup, ...draft.hair].map((s) => s.id).filter(Boolean) as string[]);
      const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
      if (toDelete.length) await supabase.from("services").delete().in("id", toDelete);
      for (const cat of ["makeup", "hair"] as const) {
        for (let i = 0; i < draft[cat].length; i++) {
          const s = draft[cat][i];
          const row = { category: cat, name: s.name, price: s.price, img: s.img, description: s.desc, sort_order: i };
          if (s.id) await supabase.from("services").update(row).eq("id", s.id);
          else await supabase.from("services").insert(row);
        }
      }
      const fresh = await fetchContent();
      setDirty(false);
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
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className="text-sm text-muted-foreground">Edit services, then click <strong>Save changes</strong>.</p>
        <div className="flex items-center gap-2">
          {savedAt && <span className="text-xs text-muted-foreground">Saved at {savedAt}</span>}
          {dirty && <span className="text-xs text-amber-700">Unsaved changes</span>}
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-full gradient-rose text-black px-5 py-2 text-sm shadow-soft disabled:opacity-60">
            <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {(["makeup", "hair"] as const).map((cat) => (
        <section key={cat} className="mb-12">
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
                    <Upload className="h-3.5 w-3.5" /> Change image
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(cat, idx, f); }} />
                  </label>
                  <button onClick={() => removeSvc(cat, idx)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ===== GALLERY =====
function GalleryPanel() {
  const items = useGallery();
  const [uploading, setUploading] = useState(false);

  const onAdd = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadSiteImage(file, "gallery");
      await supabase.from("gallery_images").insert({ img: url, sort_order: items.length });
    } catch (e: any) {
      alert("Upload failed: " + (e.message || e));
    } finally {
      setUploading(false);
    }
  };

  const onReplace = async (item: GalleryImage, file: File) => {
    try {
      const url = await uploadSiteImage(file, "gallery");
      await supabase.from("gallery_images").update({ img: url }).eq("id", item.id);
    } catch (e: any) {
      alert("Upload failed: " + (e.message || e));
    }
  };

  const onRemove = async (id: string) => {
    if (!confirm("Remove this image?")) return;
    await supabase.from("gallery_images").delete().eq("id", id);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="font-display text-2xl">Gallery <span className="text-sm text-muted-foreground">({items.length})</span></h2>
        <label className="inline-flex items-center gap-2 rounded-full gradient-rose text-black px-5 py-2 text-sm shadow-soft cursor-pointer">
          <ImagePlus className="h-4 w-4" /> {uploading ? "Uploading…" : "Add image"}
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onAdd(f); }} />
        </label>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No gallery images yet. Add one to get started.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((g) => (
            <div key={g.id} className="relative group rounded-2xl overflow-hidden border border-border bg-secondary aspect-square">
              <img src={g.img} alt={g.caption || "gallery"} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                <label className="inline-flex items-center gap-1.5 rounded-full bg-white text-black px-3 py-1.5 text-xs cursor-pointer">
                  <Upload className="h-3.5 w-3.5" /> Change
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onReplace(g, f); }} />
                </label>
                <button onClick={() => onRemove(g.id)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-red-600 text-white px-3 py-1.5 text-xs">
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
