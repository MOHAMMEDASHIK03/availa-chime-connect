import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Menu, X, Sparkles, Crown, Heart, Star, MapPin, Clock, Phone,
  Instagram, Mail, ChevronDown, ChevronLeft, ChevronRight,
  ShieldCheck, Brush, Gem, Palette, CheckCircle2, XCircle, Loader2
} from "lucide-react";
import brushesBg from "@/assets/brushes-bg.jpg";
import { useContent, useGallery } from "@/lib/content-store";
import { supabase } from "@/integrations/supabase/client";
import { rememberBooking, listLocalBookings } from "@/lib/local-bookings";
import bridal from "@/assets/bridal.jpg";
import softglam from "@/assets/softglam.jpg";
import bridalhair from "@/assets/bridalhair.jpg";
import curls from "@/assets/curls.jpg";
import hd from "@/assets/hd.jpg";
import updo from "@/assets/updo.jpg";
import simple from "@/assets/simple.jpg";
import glossy from "@/assets/glossy.jpg";
import straight from "@/assets/straight.jpg";
import gallery1 from "@/assets/gallery1.jpg";
import gallery2 from "@/assets/gallery2.jpg";

export const Route = createFileRoute("/")({ component: Index });

const WA = "61481308396";
const OWNER_EMAIL = "Kiruthikak402@gmail.com";
const waLink = (svc?: string) =>
  `https://wa.me/${WA}?text=${encodeURIComponent(
    svc ? `Hello Glamupbykirthi, I would like to book ${svc} service.` : "Hello Glamupbykirthi, I'd like to enquire about your services."
  )}`;

const fallbackGallery = [
  { src: bridal, h: "row-span-2" },
  { src: gallery1, h: "" },
  { src: softglam, h: "" },
  { src: bridalhair, h: "row-span-2" },
  { src: curls, h: "" },
  { src: gallery2, h: "row-span-2" },
  { src: hd, h: "" },
  { src: updo, h: "" },
  { src: simple, h: "" },
  { src: glossy, h: "" },
  { src: straight, h: "" },
];

const features = [
  { icon: ShieldCheck, title: "Certified Makeup Artist", desc: "Australian-trained, fully accredited and insured for your peace of mind." },
  { icon: Gem, title: "Luxury Products Only", desc: "Charlotte Tilbury, Dior, Hourglass and NARS — nothing but the best on your skin." },
  { icon: Crown, title: "Bridal Specialists", desc: "Hundreds of brides styled across Melbourne and the greater Melbourne region." },
  { icon: Brush, title: "Modern Styling", desc: "Trend-led techniques refined for Australian skin tones, climate and lighting." },
  { icon: Heart, title: "Personalised Experience", desc: "Every appointment begins with a tailored consultation — no two looks are alike." },
  { icon: Palette, title: "Skin-First Artistry", desc: "Hydrating, breathable formulas that let your natural beauty take centre stage." },
];

const testimonials = [
  { name: "Charlotte W.", role: "Bride, Melbourne", text: "Absolutely brilliant. My bridal makeup lasted from sunrise ceremony right through to the after-party. The Team is truly artistic — I felt like the most beautiful version of myself." },
  { name: "Amelia R.", role: "Melbourne", text: "The HD makeup is unreal. Looked flawless in every photo and the soft glam was exactly the vibe I was going for. Such a calm, luxurious experience in the studio." },
  { name: "Priya S.", role: "Docklands", text: "From the consultation to the final touch-up, everything was effortless and refined. The bridal hair updo was breathtaking — I keep getting compliments months later." },
  { name: "Olivia M.", role: "South Yarra", text: "Genuinely the best makeup artist in Melbourne. The Team has a magical touch and uses only the most luxurious products. Booking again for my engagement shoot." },
];

const faqs = [
  { q: "Booking policy", a: "A small deposit secures your booking. Reschedules are welcome with 48 hours' notice. Bookings are confirmed once availability is approved by our team via WhatsApp or email." },
  { q: "Terms and conditions", a: "Deposits are non-refundable but transferable to a rescheduled date with 48 hours' notice. Late arrivals may shorten the appointment time. Full terms are shared at booking confirmation." },
];

const TIME_SLOTS = ["9:00 am – 11:00 am", "2:00 pm – 4:00 pm", "5:00 pm – 6:00 pm"];

function Index() {
  const { makeup, hair } = useContent();
  const galleryDb = useGallery();
  const galleryImgs = galleryDb.length > 0
    ? galleryDb.map((g, i) => ({ src: g.img, h: i % 4 === 0 || i % 4 === 3 ? "row-span-2" : "" }))
    : fallbackGallery;
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [tIdx, setTIdx] = useState(0);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [bookOpen, setBookOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [locationType, setLocationType] = useState<"studio" | "home">("studio");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allServices = [...makeup, ...hair];
  const total = allServices
    .filter((s) => selected.includes(s.name))
    .reduce((sum, s) => sum + s.price, 0);

  const toggleService = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const openBooking = () => {
    setOpen(false);
    setBookOpen(true);
  };

  const confirmBooking = async () => {
    if (selected.length === 0) return;
    if (!customerName.trim()) { setFormError("Please enter your name."); return; }
    if (!phone.trim() || phone.trim().length < 8) { setFormError("Please enter a valid phone number."); return; }
    if (!bookingDate) { setFormError("Please choose a preferred date."); return; }
    if (!bookingTime) { setFormError("Please choose an available time slot."); return; }
    if (locationType === "home" && !address.trim()) { setFormError("Please enter your address for the home visit."); return; }
    setFormError("");
    setSubmitting(true);

    const servicesPayload = allServices
      .filter((s) => selected.includes(s.name))
      .map((s) => ({ name: s.name, price: s.price }));

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        customer_name: customerName.trim(),
        phone: phone.trim(),
        services: servicesPayload,
        total_amount: total,
        booking_date: bookingDate,
        booking_time: bookingTime,
        location_type: locationType,
        address: locationType === "home" ? address.trim() : "",
      })
      .select("id")
      .single();

    setSubmitting(false);

    if (error || !data) {
      setFormError("Could not submit booking. Please try again or contact us on WhatsApp.");
      return;
    }

    rememberBooking(data.id);

    const lines = servicesPayload.map((s) => `• ${s.name} — AUD $${s.price}`).join("\n");
    const locationLine = locationType === "studio" ? "Location: At the studio" : `Location: Home — ${address.trim()}`;
    const msg = `New booking request (ID: ${data.id.slice(0, 8)})\n\nName: ${customerName.trim()}\nPhone: ${phone.trim()}\n\nServices:\n${lines}\n\nTotal: AUD $${total}\nDate: ${bookingDate} at ${bookingTime}\n${locationLine}\n\nPlease confirm availability.`;

    // Open WhatsApp to owner with prefilled details
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
    // Open mailto to owner as backup notification channel
    const mailto = `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent("New booking request — Glamupbykirthi")}&body=${encodeURIComponent(msg)}`;
    setTimeout(() => { window.open(mailto, "_self"); }, 400);

    setBookOpen(false);
    setSelected([]);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTIdx((i) => (i + 1) % testimonials.length), 6000);
    return () => clearInterval(id);
  }, []);

  const scrollTo = (id: string) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* NAV */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? "glass shadow-soft py-3" : "py-5 bg-transparent"}`}>
        <nav className="max-w-7xl mx-auto px-5 md:px-8 flex items-center justify-between">
          <button onClick={() => scrollTo("home")} className="flex items-center gap-2 group">
            <span className="font-display font-bold text-xl md:text-2xl tracking-tight text-gradient-rose animate-logo-glow">Glamupbykirthi</span>
          </button>

          <ul className="hidden lg:flex items-center gap-9 text-sm tracking-wide text-foreground/80">
            {[["Home","home"],["About","about"],["Services","services"],["Gallery","gallery"],["Why Us","why"],["Reviews","reviews"],["FAQ","faq"],["Contact","contact"]].map(([l,id]) => (
              <li key={id}>
                <button onClick={() => scrollTo(id)} className="relative hover:text-rose-gold transition-colors after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-px after:w-0 after:bg-rose-gold after:transition-all hover:after:w-full">{l}</button>
              </li>
            ))}
          </ul>

          <button onClick={openBooking} className="hidden lg:inline-flex items-center gap-2 rounded-full gradient-rose text-black px-5 py-2.5 text-sm shadow-soft hover:opacity-95 transition">
            <Sparkles className="h-4 w-4" /> Book Now
          </button>

          <button onClick={() => setOpen(!open)} className="lg:hidden p-2 rounded-full glass" aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {/* Mobile menu */}
        <div className={`lg:hidden overflow-hidden transition-all duration-500 ${open ? "max-h-[600px] mt-4" : "max-h-0"}`}>
          <div className="mx-5 glass rounded-3xl p-6 flex flex-col gap-4">
            {/* Highlighted brand name in mobile */}
            <div className="text-center pb-3 border-b border-border/60">
              <p className="font-display font-bold text-3xl text-gradient-rose animate-logo-glow leading-none">Glamupbykirthi</p>
              <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mt-2">Luxury Beauty Studio</p>
            </div>
            {[["Home","home"],["About","about"],["Services","services"],["Gallery","gallery"],["Why Us","why"],["Reviews","reviews"],["FAQ","faq"],["Contact","contact"]].map(([l,id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-left text-foreground/90 hover:text-rose-gold transition py-1">{l}</button>
            ))}
            <button onClick={openBooking} className="mt-2 inline-flex items-center justify-center gap-2 rounded-full gradient-rose text-black px-5 py-3 text-sm">
              <Sparkles className="h-4 w-4" /> Book Appointment
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="home" className="relative min-h-screen flex items-center pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={brushesBg} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-[0.18] mix-blend-multiply" />
          <div className="absolute inset-0 gradient-soft" />
          <div className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full bg-accent/40 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-[480px] h-[480px] rounded-full bg-rose-gold-light/40 blur-3xl" />
        </div>

        <div className="max-w-3xl w-full mx-auto px-5 md:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs tracking-[0.3em] uppercase text-foreground/70 animate-fade-up">
            <Sparkles className="h-3.5 w-3.5 text-rose-gold" /> Melbourne · Est. Luxury
          </div>
          <p className="mt-8 max-w-xl mx-auto text-base md:text-lg text-muted-foreground leading-relaxed animate-fade-up delay-200">
            Glamupbykirthi is a luxury makeup and hairstyling studio in the heart of Docklands —
            where bespoke artistry, premium products and personalised care come together for your most beautiful moments.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3 animate-fade-up delay-300">
            <button onClick={openBooking} className="inline-flex items-center gap-2 rounded-full gradient-rose text-black px-7 py-3.5 text-sm tracking-wide shadow-luxe hover:scale-[1.02] transition">
              <Sparkles className="h-4 w-4" /> Book Appointment
            </button>
            <button onClick={() => scrollTo("services")} className="inline-flex items-center gap-2 rounded-full border border-foreground/20 px-7 py-3.5 text-sm tracking-wide hover:bg-foreground hover:text-background transition">
              View Services
            </button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 animate-fade-up delay-500">
            <div>
              <p className="font-display text-3xl text-rose-gold">500+</p>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Brides Styled</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div>
              <p className="font-display text-3xl text-rose-gold">5+</p>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Years Experience</p>
            </div>
            <div className="h-10 w-px bg-border hidden sm:block" />
            <div className="hidden sm:block">
              <div className="flex gap-0.5 text-rose-gold justify-center">{[0,1,2,3,4].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">5.0 Google Rated</p>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-24 md:py-32 relative">
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-rose-gold">About the studio</p>
          <div className="mt-6 space-y-5 text-muted-foreground leading-relaxed text-left sm:text-center">
            <p>Glamupbykirthi was born from a love of artistry and the belief that every woman deserves to feel like the most luminous version of herself. From our intimate Docklands studio, we craft bespoke makeup and hair experiences that feel personal, refined and quietly indulgent.</p>
            <p>Founded by our certified Team, our atelier has styled over 500 brides and editorial faces across Melbourne — championing skin-first artistry, luxury products and an unhurried, considered approach to beauty.</p>
            <p>I am specialised in HD makeup and Softglam makeup.</p>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-24 md:py-32 gradient-soft">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs tracking-[0.3em] uppercase text-rose-gold">The Menu</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl">Signature Services</h2>
            <p className="mt-5 text-muted-foreground">A curated selection of makeup and hairstyling experiences, thoughtfully priced in AUD and tailored to every occasion.</p>
          </div>

          {/* Makeup */}
          <div className="mt-16">
            <div className="flex items-end justify-between mb-8">
              <h3 className="font-display text-2xl md:text-3xl flex items-center gap-3"><Sparkles className="h-5 w-5 text-rose-gold" /> Makeup Artistry</h3>
              <span className="text-xs uppercase tracking-widest text-muted-foreground hidden sm:inline">5 Services</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {makeup.map((s) => <ServiceCard key={s.name} s={s} onBook={openBooking} />)}
            </div>
          </div>

          {/* Hair */}
          <div className="mt-20">
            <div className="flex items-end justify-between mb-8">
              <h3 className="font-display text-2xl md:text-3xl flex items-center gap-3"><Brush className="h-5 w-5 text-rose-gold" /> Hairstyling</h3>
              <span className="text-xs uppercase tracking-widest text-muted-foreground hidden sm:inline">4 Services</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {hair.map((s) => <ServiceCard key={s.name} s={s} onBook={openBooking} />)}
            </div>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section id="gallery" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs tracking-[0.3em] uppercase text-rose-gold">Portfolio</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl">Moments of <span className="italic font-script text-gradient-rose">Glamour</span></h2>
            <p className="mt-5 text-muted-foreground">A glimpse inside our studio — bridal beauty, soft glam and modern hairstyling from across Melbourne.</p>
          </div>

          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 auto-rows-[220px] md:auto-rows-[260px] gap-3 md:gap-4">
            {galleryImgs.map((g, i) => (
              <button key={i} onClick={() => setLightbox(g.src)} className={`group relative rounded-2xl overflow-hidden shadow-soft hover-lift ${g.h}`}>
                <img src={g.src} alt={`Glamupbykirthi portfolio ${i+1}`} loading="lazy" className="w-full h-full object-cover img-zoom" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
                <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {lightbox && (
          <div onClick={() => setLightbox(null)} className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm grid place-items-center p-4 animate-fade-in">
            <button className="absolute top-5 right-5 text-white/90 p-2 rounded-full glass-dark" aria-label="Close"><X className="h-5 w-5" /></button>
            <img src={lightbox} alt="Preview" className="max-h-[88vh] max-w-[92vw] rounded-2xl shadow-luxe object-contain" />
          </div>
        )}
      </section>

      {/* WHY CHOOSE US */}
      <section id="why" className="py-24 md:py-32 gradient-soft relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 md:px-8 relative">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs tracking-[0.3em] uppercase text-rose-gold">Why Choose Us</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl text-black">The Glamupbykirthi <span className="italic font-script text-gradient-rose">difference</span></h2>
          </div>
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {features.map((f) => (
              <div key={f.title} className="glass rounded-3xl p-7 hover-lift border border-border">
                <div className="h-12 w-12 rounded-2xl gradient-rose grid place-items-center mb-5"><f.icon className="h-5 w-5 text-black" /></div>
                <h3 className="font-display text-2xl text-black">{f.title}</h3>
                <p className="mt-3 text-sm text-black leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="reviews" className="py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs tracking-[0.3em] uppercase text-rose-gold">Kind Words</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl">Loved by our <span className="italic font-script text-gradient-rose">clients</span></h2>
          </div>

          <div className="mt-14 relative">
            <div className="glass rounded-[2rem] p-8 md:p-14 text-center shadow-soft min-h-[300px] flex flex-col items-center justify-center">
              <div className="flex gap-1 text-rose-gold mb-5">{[0,1,2,3,4].map(i => <Star key={i} className="h-5 w-5 fill-current" />)}</div>
              <p key={tIdx} className="font-display text-xl md:text-3xl leading-relaxed italic max-w-3xl animate-fade-up">"{testimonials[tIdx].text}"</p>
              <div className="mt-7">
                <p className="font-display text-lg">{testimonials[tIdx].name}</p>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{testimonials[tIdx].role}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6">
              <button onClick={() => setTIdx((tIdx - 1 + testimonials.length) % testimonials.length)} className="p-3 rounded-full glass hover:bg-rose-gold hover:text-white transition" aria-label="Previous">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex gap-2">
                {testimonials.map((_, i) => (
                  <button key={i} onClick={() => setTIdx(i)} className={`h-1.5 rounded-full transition-all ${i === tIdx ? "w-8 bg-rose-gold" : "w-1.5 bg-border"}`} aria-label={`Go to slide ${i+1}`} />
                ))}
              </div>
              <button onClick={() => setTIdx((tIdx + 1) % testimonials.length)} className="p-3 rounded-full glass hover:bg-rose-gold hover:text-white transition" aria-label="Next">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 md:py-32 gradient-soft">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <div className="text-center">
            <p className="text-xs tracking-[0.3em] uppercase text-rose-gold">Good to Know</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl">Policies &amp; <span className="italic font-script text-gradient-rose">terms</span></h2>
          </div>
          <div className="mt-12 space-y-3">
            {faqs.map((f, i) => {
              const isOpen = faqOpen === i;
              return (
                <div key={i} className="glass rounded-2xl overflow-hidden">
                  <button onClick={() => setFaqOpen(isOpen ? null : i)} className="w-full text-left px-6 py-5 flex items-center justify-between gap-4">
                    <span className="font-display text-lg md:text-xl">{f.q}</span>
                    <ChevronDown className={`h-5 w-5 text-rose-gold shrink-0 transition-transform duration-500 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <div className={`grid transition-all duration-500 ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <div className="overflow-hidden">
                      <p className="px-6 pb-6 text-muted-foreground leading-relaxed">{f.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs tracking-[0.3em] uppercase text-rose-gold">Get in touch</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl">Visit our <span className="italic font-script text-gradient-rose">studio</span></h2>
            <p className="mt-5 text-muted-foreground">Pop into our Docklands atelier or send us a message on WhatsApp — we'd love to hear from you.</p>
          </div>

          <div className="mt-14 grid lg:grid-cols-2 gap-8">
            <div className="glass rounded-[2rem] p-8 md:p-10 shadow-soft space-y-7">
              <div className="flex gap-4">
                <div className="h-11 w-11 rounded-2xl gradient-rose grid place-items-center text-black shrink-0"><MapPin className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Studio</p>
                  <p className="font-display text-lg mt-1">628 Flinders Street<br />Docklands, Victoria 3008<br />Melbourne, Australia</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="h-11 w-11 rounded-2xl gradient-rose grid place-items-center text-black shrink-0"><Clock className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Opening Hours</p>
                  <p className="font-display text-lg mt-1">Mon – Sun · 9:00 am – 6:00 pm</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="h-11 w-11 rounded-2xl gradient-rose grid place-items-center text-black shrink-0"><Phone className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">WhatsApp</p>
                  <a href={waLink()} target="_blank" rel="noopener noreferrer" className="font-display text-lg mt-1 hover:text-rose-gold transition block">+61 481 308 396</a>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <a href={waLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full gradient-rose text-black px-6 py-3 text-sm shadow-soft hover:scale-[1.02] transition">
                  <Sparkles className="h-4 w-4" /> Chat on WhatsApp
                </a>
                <div className="flex items-center gap-2">
                  {[
                    { Icon: Instagram, href: "https://www.instagram.com/glamup_by_kirthi?igsh=M3Q2bzdxZnFtMGF3", label: "Instagram", external: true },
                    { Icon: Mail, href: `mailto:${OWNER_EMAIL}`, label: "Email", external: false },
                  ].map(({ Icon, href, label, external }, i) => (
                    <a key={i} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} aria-label={label} className="h-11 w-11 rounded-full border border-border grid place-items-center hover:bg-rose-gold hover:text-white hover:border-rose-gold transition">
                      <Icon className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] overflow-hidden shadow-luxe min-h-[420px]">
              <iframe
                title="Glamupbykirthi Studio Location"
                src="https://www.google.com/maps?q=628+Flinders+Street,+Docklands+VIC+3008,+Australia&output=embed"
                className="w-full h-full min-h-[420px] border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-secondary text-black pt-20 pb-8 border-t border-border">
        <div className="max-w-7xl mx-auto px-5 md:px-8 grid md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <p className="font-display font-bold text-2xl text-black">Glamupbykirthi</p>
            <p className="mt-5 text-sm text-black max-w-sm leading-relaxed">Luxury makeup and hairstyling studio crafting bespoke beauty experiences from the heart of Melbourne.</p>
            <div className="mt-6 flex gap-3">
              {[
                { Icon: Instagram, href: "https://www.instagram.com/glamup_by_kirthi?igsh=M3Q2bzdxZnFtMGF3", label: "Instagram", external: true },
                { Icon: Mail, href: `mailto:${OWNER_EMAIL}`, label: "Email", external: false },
              ].map(({ Icon, href, label, external }, i) => (
                <a key={i} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} aria-label={label} className="h-10 w-10 rounded-full border border-black/20 grid place-items-center hover:bg-rose-gold transition">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <p className="font-display text-lg mb-4">Quick Links</p>
            <ul className="space-y-2 text-sm text-black">
              {[["About","about"],["Services","services"],["Gallery","gallery"],["Reviews","reviews"],["FAQ","faq"],["Contact","contact"]].map(([l,id]) => (
                <li key={id}><button onClick={() => scrollTo(id)} className="hover:underline transition">{l}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-display text-lg mb-4">Contact</p>
            <ul className="space-y-3 text-sm text-black">
              <li>628 Flinders Street, Docklands VIC 3008</li>
              <li><a href={waLink()} target="_blank" rel="noopener noreferrer" className="hover:underline">+61 481 308 396</a></li>
              <li>Mon – Sun · 9:00 am – 6:00 pm</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-5 md:px-8 mt-12 pt-6 border-t border-black/10 flex flex-col sm:flex-row justify-between gap-3 text-xs text-black">
          <p>© {new Date().getFullYear()} Glamupbykirthi. All rights reserved.</p>
          <p>Crafted with <Heart className="inline h-3 w-3 text-rose-gold fill-current" /> in Melbourne, Australia.</p>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <a
        href={waLink()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full grid place-items-center gradient-rose text-black shadow-luxe animate-pulse-ring hover:scale-110 transition"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
          <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.555-5.338 11.89-11.893 11.89a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.173.198-.297.297-.495.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.371-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413z"/>
        </svg>
      </a>

      <MyBookingsStatus />



      {/* Booking Modal */}
      {bookOpen && (
        <div
          onClick={() => setBookOpen(false)}
          className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm grid place-items-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-background rounded-3xl shadow-luxe w-full max-w-2xl max-h-[90vh] flex flex-col border border-border"
          >
            <div className="flex items-center justify-between px-6 md:px-8 pt-6 pb-4 border-b border-border">
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-rose-gold">Booking</p>
                <h3 className="font-display text-2xl md:text-3xl font-bold text-black mt-1">Select Your Services</h3>
              </div>
              <button
                onClick={() => setBookOpen(false)}
                aria-label="Close"
                className="p-2 rounded-full hover:bg-secondary transition"
              >
                <X className="h-5 w-5 text-black" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 md:px-8 py-5 space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Makeup Artistry</p>
                <div className="space-y-2">
                  {makeup.map((s) => (
                    <BookingRow key={s.name} s={s} checked={selected.includes(s.name)} onToggle={() => toggleService(s.name)} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Hairstyling</p>
                <div className="space-y-2">
                  {hair.map((s) => (
                    <BookingRow key={s.name} s={s} checked={selected.includes(s.name)} onToggle={() => toggleService(s.name)} />
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Your Details</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-black mb-1.5">Your Name *</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Full name"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-black placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-gold"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-black mb-1.5">Phone Number *</label>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 0412 345 678"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-black placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black mb-1.5">Preferred Date *</label>
                    <input
                      type="date"
                      value={bookingDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-rose-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black mb-1.5">Available Time Slot *</label>
                    <select
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-rose-gold"
                    >
                      <option value="">Choose a slot</option>
                      {TIME_SLOTS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground mt-1.5">Slots available every day.</p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="block text-xs font-bold text-black mb-2">Where would you like the service? *</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${locationType === "studio" ? "border-rose-gold bg-secondary" : "border-border hover:bg-secondary/50"}`}>
                      <input
                        type="radio"
                        name="locationType"
                        value="studio"
                        checked={locationType === "studio"}
                        onChange={() => setLocationType("studio")}
                        className="mt-1 accent-rose-gold"
                      />
                      <span>
                        <span className="block text-sm font-bold text-black">At the Studio</span>
                        <span className="block text-xs text-muted-foreground">Visit our Melbourne studio</span>
                      </span>
                    </label>
                    <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${locationType === "home" ? "border-rose-gold bg-secondary" : "border-border hover:bg-secondary/50"}`}>
                      <input
                        type="radio"
                        name="locationType"
                        value="home"
                        checked={locationType === "home"}
                        onChange={() => setLocationType("home")}
                        className="mt-1 accent-rose-gold"
                      />
                      <span>
                        <span className="block text-sm font-bold text-black">Home Service</span>
                        <span className="block text-xs text-muted-foreground">Within Melbourne only</span>
                      </span>
                    </label>
                  </div>
                </div>

                {locationType === "home" && (
                  <div className="mt-3">
                    <label className="block text-xs font-bold text-black mb-1.5">Your Address *</label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street, suburb, postcode"
                      rows={2}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-black placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-gold resize-none"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border px-6 md:px-8 py-5 bg-secondary/50 rounded-b-3xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">{selected.length} service{selected.length === 1 ? "" : "s"} selected</p>
                  <p className="font-display text-2xl md:text-3xl font-bold text-black mt-1">Total: AUD ${total}</p>
                </div>
              </div>
              {formError && (
                <p className="text-xs text-center text-red-600 mb-2 font-bold">{formError}</p>
              )}
              <button
                onClick={confirmBooking}
                disabled={selected.length === 0 || submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full gradient-rose text-black px-6 py-3.5 text-sm font-bold shadow-soft hover:scale-[1.01] transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : <><Sparkles className="h-4 w-4" /> Request Booking</>}
              </button>
              <p className="text-[11px] text-center text-muted-foreground mt-3">We'll send the request to the owner via WhatsApp & email. You'll see live confirmation status below once submitted.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceCard({ s, onBook }: { s: { name: string; price: number; img: string; desc: string }; onBook: () => void }) {
  return (
    <article className="group glass rounded-3xl hover-lift flex flex-col p-7 border border-border">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-display text-2xl font-bold text-black">{s.name}</h4>
        <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-black shrink-0">AUD ${s.price}</span>
      </div>
      <p className="mt-3 text-sm text-black leading-relaxed flex-1">{s.desc}</p>
    </article>
  );
}

function BookingRow({ s, checked, onToggle }: { s: { name: string; price: number }; checked: boolean; onToggle: () => void }) {
  return (
    <label
      className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 cursor-pointer transition ${
        checked ? "border-rose-gold bg-secondary" : "border-border hover:bg-secondary/60"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="h-5 w-5 rounded accent-rose-gold shrink-0 cursor-pointer"
        />
        <span className="font-display text-base md:text-lg font-bold text-black truncate">{s.name}</span>
      </div>
      <span className="font-bold text-sm text-black shrink-0">AUD ${s.price}</span>
    </label>
  );
}

type BookingStatusRow = {
  id: string;
  status: "pending" | "confirmed" | "declined";
  customer_name: string;
  booking_date: string;
  booking_time: string;
  total_amount: number;
  admin_note: string;
};

function MyBookingsStatus() {
  const [items, setItems] = useState<BookingStatusRow[]>([]);
  const [dismissed, setDismissed] = useState(false);

  const load = async () => {
    const ids = listLocalBookings().map((b) => b.id);
    if (ids.length === 0) { setItems([]); return; }
    const { data } = await supabase
      .from("bookings")
      .select("id,status,customer_name,booking_date,booking_time,total_amount,admin_note")
      .in("id", ids)
      .order("created_at", { ascending: false });
    setItems((data ?? []) as BookingStatusRow[]);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("my-bookings-status")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" }, () => load())
      .subscribe();
    const onStorage = () => load();
    window.addEventListener("storage", onStorage);
    const t = setInterval(load, 8000);
    return () => { supabase.removeChannel(ch); window.removeEventListener("storage", onStorage); clearInterval(t); };
  }, []);

  if (dismissed || items.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-6 z-40 w-[min(360px,calc(100vw-3rem))] glass rounded-2xl shadow-luxe border border-border overflow-hidden animate-fade-up">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/60">
        <p className="text-xs uppercase tracking-widest font-bold text-black">Your Bookings</p>
        <button onClick={() => setDismissed(true)} aria-label="Hide" className="p-1 rounded-full hover:bg-background/60">
          <X className="h-4 w-4 text-black" />
        </button>
      </div>
      <ul className="max-h-[300px] overflow-y-auto divide-y divide-border">
        {items.map((b) => (
          <li key={b.id} className="px-4 py-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-black truncate">{b.customer_name || "Booking"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{b.booking_date} · {b.booking_time}</p>
                <p className="text-xs text-muted-foreground">AUD ${b.total_amount}</p>
              </div>
              <StatusPill status={b.status} />
            </div>
            {b.status === "pending" && (
              <p className="mt-2 text-[11px] text-muted-foreground italic">Waiting for owner to confirm availability…</p>
            )}
            {b.status === "confirmed" && (
              <p className="mt-2 text-[11px] text-green-700 font-bold">Confirmed! See you soon.{b.admin_note ? ` — ${b.admin_note}` : ""}</p>
            )}
            {b.status === "declined" && (
              <p className="mt-2 text-[11px] text-red-600 font-bold">Sorry, this slot isn't available.{b.admin_note ? ` ${b.admin_note}` : ""}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusPill({ status }: { status: "pending" | "confirmed" | "declined" }) {
  if (status === "confirmed") return <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full"><CheckCircle2 className="h-3 w-3" /> Confirmed</span>;
  if (status === "declined") return <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full"><XCircle className="h-3 w-3" /> Declined</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full"><Loader2 className="h-3 w-3 animate-spin" /> Pending</span>;
}
