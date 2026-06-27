import { useState, useEffect } from "react";

const API = "http://127.0.0.1:8000/api";

const SHOP_IMG = "https://lh3.googleusercontent.com/aida-public/AB6AXuAYE_1RlMii-zwce5xoGe-_AQcyhNC2MXXnCLHRugYZbYbJfbwUl2C79ouJpms8hK78JGeZIs-Z9EvC3ItKSxOL73mJMBDrI9QPkv4qJlBX5jjCPb9SXuMKBN9aN2MP4aFGyltoFpFNZJJOikKUxV1aLIb8zfEIYeJt_DBp7EcbNvaaJ-9zcv1rnJm8kKpW8AHf2uit4kFv0qshYxb_tDLEwfm6IWI0cghWzWf50aaO0VYBQGPiaK1rQg6_b2VrFYF2ks5GxdjBOPo";
const AVATAR_IMG = "https://lh3.googleusercontent.com/aida-public/AB6AXuDHl-KjFHqbsHCO04mxY4Gzz0a9FXXUrhDZL_v0y_8bNahG7BwbqgoY9HBhC6zKl_LbyT431EOHHF7yJrluLPWjJX5FfzvOJl9uHPUw3RAbBmFIHecmmW--VXAF4-9k1mQjJ07gErIvECBGLst1ML0Zy3xcKSolQkW4VW17aidWczXj_KRdxaDEpeqc6QsmYz3eCvL9_-HGJYYP89bGgYPSHMt_lXCqX-VimKq1Ny-A1Q0kWGStuve5abixy0JkeQPBL-eZm5a6PjE";

type Slot = { id: string; start_time: string; end_time: string; service: string; base_price: number; incentive_price: number | null; incentive_label: string | null; is_peak: boolean; is_booked: boolean; };
type Booking = { booking_id: string; customer_name: string; service: string; start_time: string; price_paid: number; incentive_applied: boolean; message: string; };
type ForecastReport = { shop_name: string; date: string; overall_summary: string; peak_warning: string; suggested_action: string; hourly_forecast: { hour: string; predicted_occupancy_pct: number; is_peak: boolean; forecast_label: string }[]; };
type User = { name: string; email: string; phone: string; type: "customer" | "business"; payment?: string };
type Shop = { id: string; name: string; location: string; distance: string; rating: number; reviews: number; services: string[]; basePrice: number; favourite: boolean; tag: string; reviews_list: { author: string; rating: number; comment: string; date: string }[]; };
type Page = "splash" | "signup-type" | "signup-customer" | "signup-business" | "login" | "landing" | "shop" | "booking-confirm" | "owner-dashboard" | "leave-review";

const SHOPS: Shop[] = [
  { id: "kens", name: "Ken's Barbershop", location: "Tanjong Pagar", distance: "0.3km", rating: 4.8, reviews: 124, services: ["Haircut", "Shave", "Haircut + Shave"], basePrice: 30, favourite: true, tag: "Closest", reviews_list: [{ author: "Wei Jie", rating: 5, comment: "Great cut, booked the off-peak slot and saved $6. Will come back.", date: "2 days ago" }, { author: "Rajan S.", rating: 5, comment: "Best barbershop in Tanjong Pagar. Always clean and on time.", date: "1 week ago" }, { author: "Marcus L.", rating: 4, comment: "Good experience, the AI deal for 9am was a nice touch.", date: "2 weeks ago" }] },
  { id: "upper", name: "Upper Cut SG", location: "Telok Ayer", distance: "0.7km", rating: 4.6, reviews: 89, services: ["Haircut", "Beard Trim", "Hair Wash"], basePrice: 28, favourite: false, tag: "Popular", reviews_list: [{ author: "Daniel T.", rating: 5, comment: "Friendly staff, quick service.", date: "3 days ago" }, { author: "Priya M.", rating: 4, comment: "Good value, the 20% deal made it worth coming at 10am.", date: "1 week ago" }] },
  { id: "fade", name: "Fade Studio", location: "Chinatown", distance: "0.9km", rating: 4.5, reviews: 67, services: ["Haircut", "Fade", "Styling"], basePrice: 35, favourite: false, tag: "Top Rated", reviews_list: [{ author: "Jason K.", rating: 5, comment: "Specialise in fades. Booked via Slotly easily.", date: "5 days ago" }] },
];

const CUSTOMER_NAV: { key: string; label: string; icon: string; page?: Page }[] = [
  { key: "search", label: "Search", icon: "search", page: "landing" },
  { key: "bookings", label: "Bookings", icon: "calendar_month" },
  { key: "favorites", label: "Favorites", icon: "favorite" },
  { key: "profile", label: "Profile", icon: "person" },
];
const OWNER_NAV: { key: string; label: string; icon: string; page?: Page }[] = [
  { key: "home", label: "Home", icon: "home", page: "owner-dashboard" },
  { key: "bookings", label: "Bookings", icon: "calendar_month" },
  { key: "data", label: "Data", icon: "bar_chart" },
  { key: "account", label: "Account", icon: "person" },
];

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`} style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>{name}</span>;
}

function Stars({ n }: { n: number }) {
  return <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <span key={i} className="material-symbols-outlined text-amber-500 text-sm" style={{ fontVariationSettings: `'FILL' ${i <= n ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24` }}>star</span>)}</div>;
}

function BottomNav({ active, items, onNav }: { active: string; items: { key: string; label: string; icon: string; page?: Page }[]; onNav: (p: Page) => void }) {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-[#c6c6cd] flex justify-around items-center h-16 z-50">
      {items.map(item => (
        <button key={item.key} onClick={() => item.page && onNav(item.page)} className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${active === item.key ? "text-black" : "text-[#76777d]"}`}>
          <Icon name={item.icon} className="text-xl" />
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("splash");
  const [user, setUser] = useState<User | null>(null);
  const [selectedShop, setSelectedShop] = useState<Shop>(SHOPS[0]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [confirmation, setConfirmation] = useState<Booking | null>(null);
  const [forecast, setForecast] = useState<ForecastReport | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("apple-pay");
  const [booking, setBooking] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [businessDiscount, setBusinessDiscount] = useState(20);
  const [businessOffer, setBusinessOffer] = useState("Free hair wash with every weekday booking");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", bizName: "", location: "", service: "", price: "" });

  useEffect(() => { if (page === "shop") fetch(`${API}/slots`).then(r => r.json()).then(setSlots); }, [page]);
  useEffect(() => { if (page === "owner-dashboard") { setLoadingForecast(true); fetch(`${API}/slots/demand-forecast`).then(r => r.json()).then(d => { setForecast(d); setLoadingForecast(false); }); } }, [page]);

  async function handleBook() {
    if (!selectedSlot) return;
    setBooking(true);
    const res = await fetch(`${API}/bookings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slot_id: selectedSlot.id, customer_name: user?.name ?? "Guest", customer_phone: user?.phone ?? "", service: selectedSlot.service }) });
    const data = await res.json();
    setConfirmation(data);
    setSlots(prev => prev.map(s => s.id === selectedSlot.id ? { ...s, is_booked: true } : s));
    setBooking(false);
    setPage("booking-confirm");
  }

  function formatTime(iso: string) { return new Date(iso).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", hour12: true }); }

  const styles = {
    container: "min-h-screen bg-[#fcf8fa] text-[#1b1b1d] font-[Inter,sans-serif] antialiased",
    header: "fixed top-0 left-0 w-full z-50 flex justify-between items-center px-5 h-16 bg-[#fcf8fa] border-b border-[#c6c6cd]",
    headerTitle: "text-2xl font-bold tracking-tight text-black",
    label: "text-[11px] font-semibold uppercase tracking-widest text-[#45464d] mb-3",
    labelTight: "text-[11px] font-semibold uppercase tracking-widest text-[#45464d]",
    input: "w-full border border-[#c6c6cd] rounded-xl bg-white px-4 py-3 text-sm text-[#1b1b1d] placeholder-[#76777d] focus:outline-none focus:border-black transition-colors",
    primaryBtn: "w-full bg-black text-white rounded-full py-3.5 text-sm font-semibold uppercase tracking-widest hover:bg-[#131b2e] transition-colors",
    secondaryBtn: "w-full border border-black text-black rounded-full py-3.5 text-sm font-semibold uppercase tracking-widest hover:bg-[#f0edee] transition-colors",
    card: "bg-white border border-[#c6c6cd] rounded-2xl p-5",
    dealCard: "bg-[#F0FDF4] border border-[#DCFCE7] rounded-2xl p-4",
    chip: "text-[11px] font-semibold uppercase tracking-widest bg-[#e4e2e4] text-[#45464d] rounded-full px-3 py-1",
  };

  // ─── SPLASH ───
  if (page === "splash") return (
    <div key={page} className="min-h-screen bg-black flex flex-col items-center px-8 py-16">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative w-20 h-20 mb-6">
          <div className="w-20 h-20 bg-[#131b2e] rounded-3xl flex items-center justify-center">
            <Icon name="calendar_month" className="text-white text-4xl" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-9 h-9 bg-white rounded-xl flex items-center justify-center">
            <Icon name="location_on" className="text-black text-base" />
          </div>
        </div>
        <div className="text-white text-4xl font-bold tracking-tight mb-2">Slotly</div>
        <div className="text-[#76777d] text-sm">Book smarter. Save more.</div>
      </div>
      <div className="w-full max-w-xs flex flex-col gap-3">
        <button onClick={() => setPage("signup-type")} className="bg-white text-black rounded-full py-4 text-sm font-semibold">Get Started</button>
        <button onClick={() => setPage("login")} className="border border-[#45464d] text-white rounded-full py-4 text-sm font-semibold">Log In</button>
      </div>
    </div>
  );

  // ─── SIGNUP TYPE ───
  if (page === "signup-type") return (
    <div key={page} className={styles.container}>
      <div className="pt-10 px-5 pb-16">
        <div className="text-3xl font-bold tracking-tight text-center mb-2">Join Slotly as...</div>
        <div className="text-sm text-[#45464d] text-center mb-8">Choose the account type that best fits your needs to get started with seamless scheduling.</div>
        <div className="flex flex-col gap-5">
          <div className="border border-[#c6c6cd] rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-[#131b2e] rounded-full flex items-center justify-center mx-auto mb-4"><Icon name="person" className="text-white text-2xl" /></div>
            <div className="font-bold text-lg mb-2">I'm a customer</div>
            <div className="text-sm text-[#45464d] mb-5">Find local services, book appointments instantly, and manage your schedule effortlessly.</div>
            <button onClick={() => setPage("signup-customer")} className="bg-[#131b2e] text-white rounded-full px-6 py-2.5 text-sm font-semibold">Get Started</button>
          </div>
          <div className="border border-[#c6c6cd] rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-[#131b2e] rounded-full flex items-center justify-center mx-auto mb-4"><Icon name="storefront" className="text-white text-2xl" /></div>
            <div className="font-bold text-lg mb-2">I'm a business</div>
            <div className="text-sm text-[#45464d] mb-5">Manage your shop, optimize staff schedules, and grow your revenue with AI-driven insights.</div>
            <button onClick={() => setPage("signup-business")} className="bg-[#131b2e] text-white rounded-full px-6 py-2.5 text-sm font-semibold">Register Business</button>
          </div>
        </div>
        <div className="text-center text-sm text-[#45464d] mt-6">Already have an account? <button onClick={() => setPage("login")} className="font-bold text-black">Log in</button></div>
        <div className="flex justify-center mt-8">
          <span className="inline-flex items-center gap-2 text-xs text-[#45464d] border border-[#c6c6cd] rounded-full px-4 py-2">
            <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full" />Secure & Encrypted Onboarding
          </span>
        </div>
      </div>
    </div>
  );

  // ─── SIGNUP CUSTOMER ───
  if (page === "signup-customer") return (
    <div key={page} className={styles.container}>
      <div className="px-5 pt-6"><button onClick={() => setPage("signup-type")}><Icon name="arrow_back" /></button></div>
      <div className="px-6 pt-2 pb-16">
        <div className="text-3xl font-bold tracking-tight text-center mb-2">Join our community</div>
        <div className="text-sm text-[#45464d] text-center mb-8">Experience seamless booking and exclusive member perks.</div>
        <div className="bg-white border border-[#c6c6cd] rounded-2xl p-5 flex flex-col gap-5">
          {[["Full name", "name", "Adam Mikail", "text"], ["Email", "email", "adam@email.com", "email"], ["Phone", "phone", "+65 9123 4567", "tel"], ["Password", "password", "••••••••", "password"]].map(([label, key, ph, type]) => (
            <div key={key}>
              <div className={styles.label}>{label}</div>
              <input type={type} placeholder={ph} value={form[key as keyof typeof form]} onChange={e => setForm({ ...form, [key]: e.target.value })} className={styles.input} />
            </div>
          ))}
          <div>
            <div className={styles.label}>Payment method</div>
            <div className="flex gap-2">
              {[["apple-pay", "Apple Pay"], ["card", "Card"], ["cash", "Cash on site"]].map(([val, label]) => (
                <button key={val} onClick={() => setPaymentMethod(val)} className={`flex-1 py-2.5 rounded-full text-xs font-semibold border transition-colors ${paymentMethod === val ? "bg-black text-white border-black" : "bg-white text-black border-[#c6c6cd]"}`}>{label}</button>
              ))}
            </div>
          </div>
          <button onClick={() => { setUser({ name: form.name || "Adam Mikail", email: form.email, phone: form.phone, type: "customer", payment: paymentMethod }); setPage("landing"); }} className={styles.primaryBtn}>Create Account</button>
          <div className="text-center text-sm text-[#45464d]">Already have an account? <button onClick={() => setPage("login")} className="font-bold text-black">Sign In</button></div>
        </div>
        <div className="flex justify-center gap-6 mt-6 text-xs text-[#45464d]">
          <span className="flex items-center gap-1"><Icon name="lock" className="text-sm" />Secure Encryption</span>
          <span className="flex items-center gap-1"><Icon name="verified_user" className="text-sm" />Privacy Guaranteed</span>
        </div>
      </div>
    </div>
  );

  // ─── SIGNUP BUSINESS ───
  if (page === "signup-business") return (
    <div key={page} className={styles.container}>
      <div className="flex justify-end px-5 pt-6"><button onClick={() => setPage("login")} className="border border-[#c6c6cd] rounded-full px-4 py-2 text-xs font-semibold">Already have a shop? Sign in</button></div>
      <div className="px-5 pt-5 pb-16">
        <div className="relative rounded-2xl overflow-hidden h-40 mb-5">
          <img src={SHOP_IMG} alt="Shop preview" className="w-full h-full object-cover" />
          <span className="absolute bottom-3 left-3 bg-white/90 rounded-full px-3 py-1 text-xs font-semibold">Shop Preview</span>
        </div>
        <div className="border border-[#c6c6cd] rounded-2xl p-5 mb-6">
          <div className="font-bold text-sm mb-3">Why Slotly?</div>
          <div className="flex flex-col gap-2 text-sm text-[#45464d]">
            <div className="flex items-center gap-2"><Icon name="check_circle" className="text-[#22C55E] text-base" />Automated scheduling & payments</div>
            <div className="flex items-center gap-2"><Icon name="check_circle" className="text-[#22C55E] text-base" />Dynamic pricing for off-peak hours</div>
            <div className="flex items-center gap-2"><Icon name="check_circle" className="text-[#22C55E] text-base" />Built-in customer marketing tools</div>
          </div>
        </div>
        <div className="text-2xl font-bold mb-1">Launch your business</div>
        <div className="text-sm text-[#45464d] mb-6">Set up your profile and start accepting bookings in minutes.</div>
        <div className="flex flex-col gap-5 mb-6">
          <div><div className={styles.label}>Business Name</div><input placeholder="Ken's Barbershop" value={form.bizName} onChange={e => setForm({ ...form, bizName: e.target.value })} className={styles.input} /></div>
          <div><div className={styles.label}>Location</div><input placeholder="Tanjong Pagar, Singapore" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className={styles.input} /></div>
          <div>
            <div className={styles.label}>Services & Pricing</div>
            <div className="bg-[#f6f3f5] rounded-2xl p-4 flex flex-col gap-3">
              <div><div className="text-xs text-[#45464d] mb-1">Service Name</div><input placeholder="e.g. Haircut" value={form.service} onChange={e => setForm({ ...form, service: e.target.value })} className={styles.input} /></div>
              <div><div className="text-xs text-[#45464d] mb-1">Price ($)</div><input placeholder="0.00" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className={styles.input} /></div>
              <label className="flex items-center gap-2 text-xs text-[#45464d]"><input type="checkbox" defaultChecked className="accent-black" />Apply Off-peak Discount</label>
            </div>
          </div>
          <button className="flex items-center gap-2 text-sm font-semibold text-left"><Icon name="add_circle" />Add Another Service</button>
          <div className="bg-[#f6f3f5] rounded-2xl p-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-semibold flex items-center gap-1"><Icon name="trending_down" className="text-base" />Off-peak Discount</span>
              <span className="font-bold">{businessDiscount}%</span>
            </div>
            <input type="range" min={5} max={40} value={businessDiscount} onChange={e => setBusinessDiscount(Number(e.target.value))} className="w-full accent-black" />
            <div className="text-xs text-[#76777d] italic mt-1">Encourage bookings during slower hours with dynamic pricing.</div>
          </div>
          <div><div className={styles.label}>Store-wide promotion (If Applicable)</div><input placeholder="e.g. Free scalp massage" value={businessOffer} onChange={e => setBusinessOffer(e.target.value)} className={styles.input} /></div>
        </div>
        <button onClick={() => { setUser({ name: form.bizName || "Ken's Barbershop", email: form.email, phone: form.phone, type: "business" }); setPage("owner-dashboard"); }} className={styles.primaryBtn + " mb-6"}>Open My Shop 🚀</button>
        <div className="text-center text-[10px] text-[#76777d]">© 2026 Slotly Business. Secure data processing compliant with global standards.</div>
      </div>
    </div>
  );

  // ─── LOGIN ───
  if (page === "login") return (
    <div key={page} className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => setPage("splash")}><Icon name="arrow_back" /></button>
        <span className={styles.headerTitle}>Slotly</span>
        <div className="w-8" />
      </header>
      <div className="pt-24 px-5">
        <div className="text-3xl font-bold tracking-tight mb-1">Welcome back</div>
        <div className="text-[#45464d] text-sm mb-8">Log in to your account</div>
        <div className="flex flex-col gap-6">
          <div><div className={styles.label}>Email</div><input placeholder="adam@email.com" className={styles.input} /></div>
          <div><div className={styles.label}>Password</div><input type="password" placeholder="••••••••" className={styles.input} /></div>
          <button onClick={() => { setUser({ name: "Adam Mikail", email: "adam@email.com", phone: "+65 9123 4567", type: "customer", payment: "apple-pay" }); setPage("landing"); }} className={styles.primaryBtn}>Log in as customer</button>
          <button onClick={() => { setUser({ name: "Ken's Barbershop", email: "ken@barbershop.com", phone: "+65 9999 0000", type: "business" }); setPage("owner-dashboard"); }} className={styles.secondaryBtn}>Log in as business</button>
        </div>
      </div>
    </div>
  );

  // ─── LANDING ───
  if (page === "landing") return (
    <div key={page} className={styles.container}>
      <header className={styles.header}>
        <span className={styles.headerTitle}>Slotly</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#45464d]">Hi, {user?.name?.split(" ")[0]}</span>
          <div className="w-9 h-9 rounded-full overflow-hidden border border-[#c6c6cd]"><img src={AVATAR_IMG} alt="" className="w-full h-full object-cover" /></div>
        </div>
      </header>
      <div className="pt-20 px-5 pb-28">
        <div className="text-[11px] uppercase tracking-widest text-[#45464d] mb-1">Refined Grooming</div>
        <div className="text-3xl font-bold tracking-tight mb-5">Welcome back, {user?.name?.split(" ")[0] ?? "there"}</div>

        <div className="relative rounded-2xl overflow-hidden h-44 mb-6 bg-[#dcd9db]">
          <div className="absolute inset-0 flex items-center justify-center"><Icon name="map" className="text-6xl text-[#76777d]" /></div>
          <span className="absolute top-3 left-3 bg-white rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1"><Icon name="location_on" className="text-sm text-red-500" />{selectedShop.location}</span>
          <span className="absolute bottom-3 left-3 bg-white rounded-full px-3 py-1 text-xs font-semibold">{SHOPS[0].name} · {SHOPS[0].distance}</span>
          <div className="absolute bottom-3 right-3 w-10 h-10 bg-black rounded-full flex items-center justify-center"><Icon name="content_cut" className="text-white" /></div>
        </div>

        <div className="flex justify-between items-baseline mb-3"><div className="font-bold text-lg">Curated Offers</div><button className="text-xs font-semibold text-[#45464d]">View All</button></div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar mb-8 -mx-5 px-5">
          <div className="relative shrink-0 w-64 h-40 rounded-2xl overflow-hidden">
            <img src={SHOP_IMG} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <span className="absolute top-3 left-3 bg-white/90 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase">Member Exclusive</span>
            <div className="absolute bottom-3 left-3 right-3 text-white">
              <div className="font-bold text-sm mb-2">{SHOPS[0].name}: Complimentary Wash</div>
              <button className="bg-white text-black rounded-full px-3 py-1.5 text-xs font-semibold">Claim Offer</button>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-baseline mb-3"><div className="font-bold text-lg">Favourited Destinations</div></div>
        <div className="flex flex-col gap-3 mb-8">
          {SHOPS.filter(s => s.favourite).map(shop => (
            <button key={shop.id} onClick={() => { setSelectedShop(shop); setPage("shop"); }} className="flex items-center gap-3 border border-[#c6c6cd] rounded-2xl p-3 text-left">
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0"><img src={SHOP_IMG} alt="" className="w-full h-full object-cover" /></div>
              <div className="flex-1"><div className="font-semibold text-sm">{shop.name}</div><div className="text-xs text-[#45464d]">{shop.location} · {shop.distance}</div></div>
              <Icon name="favorite" className="text-red-500" />
            </button>
          ))}
        </div>

        <div className="flex justify-between items-baseline mb-3"><div className="font-bold text-lg">Nearby You</div></div>
        <div className="flex flex-col gap-3">
          {SHOPS.map(shop => (
            <button key={shop.id} onClick={() => { setSelectedShop(shop); setPage("shop"); }} className="flex items-center gap-3 border border-[#c6c6cd] rounded-2xl p-3 text-left">
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0"><img src={SHOP_IMG} alt="" className="w-full h-full object-cover" /></div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{shop.name}</div>
                <div className="text-xs text-[#45464d]">{shop.location} · {shop.distance}</div>
              </div>
              <span className={styles.chip}>{shop.tag}</span>
            </button>
          ))}
        </div>
      </div>
      <BottomNav active="search" items={CUSTOMER_NAV} onNav={setPage} />
    </div>
  );

  // ─── SHOP PAGE ───
  if (page === "shop") return (
    <div key={page} className={styles.container + " pb-10"}>
      <header className={styles.header}>
        <button onClick={() => setPage("landing")}><Icon name="arrow_back" /></button>
        <span className={styles.headerTitle}>Slotly</span>
        <div className="w-9 h-9 rounded-full overflow-hidden border border-[#c6c6cd]"><img src={AVATAR_IMG} alt="" className="w-full h-full object-cover" /></div>
      </header>
      <div className="pt-16">
        <div className="w-full h-48 overflow-hidden">
          <img src={SHOP_IMG} alt={selectedShop.name} className="w-full h-full object-cover" />
        </div>
        <div className="px-5 -mt-6 relative z-10">
          <div className="bg-white border border-[#c6c6cd] rounded-2xl p-4 mb-4 shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xl font-bold tracking-tight">{selectedShop.name}</div>
                <div className="text-[#45464d] text-sm flex items-center gap-1 mt-1"><Icon name="location_on" className="text-sm" />{selectedShop.location}</div>
              </div>
              <div className="flex items-center gap-1 bg-[#e4e2e4] rounded-full px-2.5 py-1">
                <span className="material-symbols-outlined text-amber-500 text-sm" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>star</span>
                <span className="text-xs font-bold">{selectedShop.rating}</span>
              </div>
            </div>
          </div>

          <div className={styles.dealCard + " flex items-center gap-3 mb-5"}>
            <div className="bg-[#22C55E] text-white rounded-full p-1.5"><Icon name="sell" className="text-base" /></div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-[#166534]">Off-peak Deal: 20% off</div>
              <div className="text-xs text-[#166534] opacity-80">Book quiet hour slots and save</div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-3">
            <div className="text-base font-bold">Available Slots</div>
            <div className="text-xs text-[#45464d] uppercase tracking-widest">Sat 27 Jun</div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {slots.map(slot => (
              <button key={slot.id} disabled={slot.is_booked} onClick={() => setSelectedSlot(slot)}
                className={`flex flex-col p-4 rounded-xl text-left transition-all active:scale-95 ${slot.is_booked ? "opacity-50 cursor-not-allowed bg-[#f6f3f5] border border-[#c6c6cd]" : selectedSlot?.id === slot.id ? "bg-black text-white border border-black" : slot.incentive_price ? "bg-[#F0FDF4] border border-[#DCFCE7] hover:shadow-md" : "bg-white border border-[#c6c6cd] hover:shadow-md"}`}>
                <div className="flex justify-between items-start w-full mb-2">
                  <span className={`text-lg font-bold ${selectedSlot?.id === slot.id ? "text-white" : "text-black"}`}>{formatTime(slot.start_time)}</span>
                  {!slot.is_booked && slot.incentive_price && selectedSlot?.id !== slot.id && <span className="bg-[#22C55E] text-white text-[9px] font-bold rounded-full px-2 py-0.5 uppercase tracking-widest">20% OFF</span>}
                  {!slot.is_booked && slot.is_peak && !slot.incentive_price && <span className="bg-amber-100 text-amber-800 text-[9px] font-bold rounded-full px-2 py-0.5 uppercase tracking-widest">Peak</span>}
                  {slot.is_booked && <span className="text-[9px] font-bold uppercase tracking-widest text-red-500">FULL</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-base font-bold ${selectedSlot?.id === slot.id ? "text-white" : slot.incentive_price ? "text-[#166534]" : "text-black"}`}>${slot.incentive_price ?? slot.base_price}</span>
                  {slot.incentive_price && selectedSlot?.id !== slot.id && <span className="text-xs text-[#76777d] line-through">${slot.base_price}</span>}
                </div>
              </button>
            ))}
          </div>

          {selectedSlot && (
            <div className="border border-[#c6c6cd] bg-white rounded-2xl p-5 mb-6">
              <div className="font-bold mb-0.5">{formatTime(selectedSlot.start_time)} · {selectedSlot.service}</div>
              <div className="text-sm text-[#45464d] mb-4">${selectedSlot.incentive_price ?? selectedSlot.base_price}{selectedSlot.incentive_price && ` · saving $${selectedSlot.base_price - selectedSlot.incentive_price}`}</div>
              <div className={styles.label}>Payment method</div>
              <div className="flex gap-2 mb-4">
                {[["apple-pay", "Apple Pay"], ["card", "Card"], ["cash", "Cash"]].map(([val, label]) => (
                  <button key={val} onClick={() => setPaymentMethod(val)} className={`flex-1 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors ${paymentMethod === val ? "bg-black text-white border-black" : "bg-white text-black border-[#c6c6cd]"}`}>{label}</button>
                ))}
              </div>
              <button onClick={handleBook} disabled={booking} className={styles.primaryBtn + " disabled:opacity-40"}>
                {booking ? "Confirming..." : `Pay with ${paymentMethod === "apple-pay" ? "Apple Pay" : paymentMethod === "card" ? "Card" : "Cash on site"}`}
              </button>
            </div>
          )}

          <div className="flex justify-between items-baseline mb-3">
            <div className="font-bold text-base">Reviews</div>
            <button className="text-xs font-bold uppercase tracking-widest text-black">See all</button>
          </div>
          <div className="flex flex-col gap-3">
            {selectedShop.reviews_list.map((r, i) => (
              <div key={i} className="bg-white border border-[#c6c6cd] rounded-2xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-xs font-bold">{r.author[0]}</div>
                    <span className="text-sm font-semibold">{r.author}</span>
                  </div>
                  <span className="text-xs text-[#76777d]">{r.date}</span>
                </div>
                <Stars n={r.rating} />
                <div className="text-sm text-[#45464d] mt-2">{r.comment}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ─── BOOKING CONFIRM ───
  if (page === "booking-confirm" && confirmation) return (
    <div key={page} className={styles.container + " px-5 pt-10 pb-16"}>
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-20 h-20 rounded-full bg-[#F0FDF4] border-4 border-[#DCFCE7] flex items-center justify-center mb-5">
          <Icon name="check" className="text-[#22C55E] text-4xl" />
        </div>
        <div className="text-2xl font-bold mb-1">Booking Confirmed!</div>
        <div className="text-sm text-[#45464d]">Your appointment has been successfully scheduled.</div>
      </div>

      {confirmation.incentive_applied && (
        <div className={styles.dealCard + " flex items-center gap-3 mb-5"}>
          <div className="bg-[#22C55E] text-white rounded-full p-2"><Icon name="savings" className="text-base" /></div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#166534]">Smart Savings</div>
            <div className="text-sm font-semibold text-[#166534]">You saved ${selectedSlot ? selectedSlot.base_price - (selectedSlot.incentive_price ?? selectedSlot.base_price) : 0} with Slotly AI</div>
          </div>
        </div>
      )}

      <div className="border border-[#c6c6cd] rounded-2xl bg-white p-5 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div><div className="text-[10px] uppercase tracking-widest text-[#76777d] mb-1">Service</div><div className="font-bold">{confirmation.service}</div></div>
          <div className="text-right"><div className="text-[10px] uppercase tracking-widest text-[#76777d] mb-1">Price Paid</div><div className="font-bold">${confirmation.price_paid}</div></div>
        </div>
        <div className="flex items-center gap-4 text-sm text-[#45464d] mb-4">
          <span className="flex items-center gap-1"><Icon name="calendar_month" className="text-base" />Sat 27 Jun</span>
          <span className="flex items-center gap-1"><Icon name="schedule" className="text-base" />{formatTime(confirmation.start_time)}</span>
        </div>
        <div className="border-t border-[#e4e2e4] pt-4 mb-4">
          <div className="text-[10px] uppercase tracking-widest text-[#76777d] mb-1">Location</div>
          <div className="flex items-center gap-1 text-sm font-medium"><Icon name="location_on" className="text-base" />{selectedShop.name}, {selectedShop.location}</div>
        </div>
        <div className="border-t border-[#e4e2e4] pt-4 flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-widest text-[#76777d]">Payment Method</div>
          <div className="flex items-center gap-2 text-sm font-semibold"><Icon name="credit_card" className="text-base" />{paymentMethod === "apple-pay" ? "Apple Pay" : paymentMethod === "card" ? "Card" : "Cash on site"}</div>
        </div>
      </div>

      <button onClick={() => setPage("leave-review")} className={styles.primaryBtn + " mb-3"}>Leave a Review</button>
      <button onClick={() => { setSelectedSlot(null); setConfirmation(null); setPage("landing"); }} className={styles.secondaryBtn + " mb-8"}>Go to My Bookings</button>

      <div className="flex justify-between items-baseline mb-3"><div className="font-bold">Location</div><button className="text-xs font-semibold text-[#45464d] underline">Get Directions</button></div>
      <div className="rounded-2xl overflow-hidden h-36 bg-[#dcd9db] flex items-center justify-center"><Icon name="map" className="text-5xl text-[#76777d]" /></div>
    </div>
  );

  // ─── LEAVE REVIEW ───
  if (page === "leave-review") return (
    <div key={page} className={styles.container}>
      <div className="px-5 pt-6"><button onClick={() => setPage("booking-confirm")}><Icon name="arrow_back" /></button></div>
      <div className="px-5 pt-4 pb-16">
        <div className="flex items-center gap-3 border border-[#c6c6cd] rounded-2xl p-3 mb-6">
          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0"><img src={SHOP_IMG} alt="" className="w-full h-full object-cover" /></div>
          <div><div className="font-bold text-sm">{confirmation?.service ?? "Haircut"}</div><div className="text-xs text-[#45464d]">Completed on {confirmation ? formatTime(confirmation.start_time) : ""}</div></div>
        </div>

        <div className="text-center mb-6">
          <div className="text-[11px] uppercase tracking-widest text-[#45464d] mb-3">Tap to rate</div>
          <div className="flex justify-center gap-3 mb-3">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setReviewRating(n)}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: `'FILL' ${n <= reviewRating ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`, color: n <= reviewRating ? "#f59e0b" : "#e4e2e4", fontSize: "36px" }}>star</span>
              </button>
            ))}
          </div>
          <div className="text-sm text-[#45464d]">How was your experience?</div>
        </div>

        <div className={styles.label}>Detailed feedback</div>
        <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Tell us about your experience..." className="w-full border border-[#c6c6cd] rounded-2xl bg-white p-4 text-sm placeholder-[#76777d] focus:outline-none focus:border-black h-32 resize-none mb-5" />

        <div className="flex flex-wrap gap-2 mb-8">
          {["Friendly staff", "On time", "Great result", "Clean space"].map(tag => (
            <button key={tag} onClick={() => setReviewTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
              className={`rounded-full px-4 py-2 text-xs font-semibold border transition-colors ${reviewTags.includes(tag) ? "bg-black text-white border-black" : "bg-white text-[#45464d] border-[#c6c6cd]"}`}>{tag}</button>
          ))}
        </div>

        <button onClick={() => { setReviewText(""); setReviewTags([]); setPage("landing"); }} className={`w-full rounded-full py-3.5 font-semibold mb-3 transition-colors ${reviewText ? "bg-black text-white" : "bg-[#e4e2e4] text-[#76777d]"}`}>Submit Review</button>
        <div className="text-center text-xs text-[#76777d]">Your review helps our community grow.</div>
      </div>
    </div>
  );

  // ─── OWNER DASHBOARD ───
  if (page === "owner-dashboard") return (
    <div key={page} className={styles.container}>
      <header className={styles.header}>
        <span className={styles.headerTitle}>Slotly</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setPage("splash")} className="text-xs font-bold uppercase tracking-widest text-[#45464d]">Sign out</button>
          <div className="w-9 h-9 rounded-full overflow-hidden border border-[#c6c6cd]"><img src={AVATAR_IMG} alt="" className="w-full h-full object-cover" /></div>
        </div>
      </header>
      <div className="pt-20 px-5 pb-28">
        <div className="mb-2">
          <div className="text-3xl font-bold tracking-tight">Good morning 👋</div>
          <div className="text-[#45464d] text-sm mt-1">Sat 27 June · {user?.name ?? "Ken's Barbershop"}</div>
        </div>

        <div className="border-t border-[#e4e2e4] mt-4">
          {[{ label: "Bookings filled", value: "7/12", sub: "+5%", subColor: "text-[#22C55E]" }, { label: "Revenue", value: "$198", sub: "Today", subColor: "text-[#76777d]" }, { label: "Off-peak deals", value: "3", sub: "Active", subColor: "text-[#76777d]" }].map(m => (
            <div key={m.label} className="flex items-baseline justify-between py-4 border-b border-[#e4e2e4]">
              <div><div className={styles.labelTight + " mb-1"}>{m.label}</div><div className="text-2xl font-bold">{m.value}</div></div>
              <div className={`text-xs font-semibold ${m.subColor}`}>{m.sub}</div>
            </div>
          ))}
        </div>

        <div className="bg-[#1b1b1d] rounded-2xl p-5 my-6 text-white">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#76777d] mb-3 flex items-center gap-1"><Icon name="auto_awesome" className="text-sm" />AI Forecast</div>
          {loadingForecast ? <div className="text-sm text-[#76777d]">Generating forecast...</div> : forecast ? (
            <>
              <p className="text-base italic leading-relaxed mb-4">"{forecast.suggested_action}"</p>
              <button onClick={() => setBusinessDiscount(Math.min(40, businessDiscount + 5))} className="border border-white/40 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest">Apply Offer</button>
            </>
          ) : <div className="text-sm text-[#76777d]">Could not load forecast</div>}
        </div>

        {forecast && (
          <div className="border border-[#c6c6cd] bg-white rounded-2xl p-5 mb-6">
            <div className="flex justify-between items-center mb-4">
              <div className={styles.labelTight}>Hourly demand</div>
              <div className="flex items-center gap-3 text-[10px] text-[#45464d]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#131b2e]" />Normal</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Exceptionally busy</span>
              </div>
            </div>
            <div className="flex items-end justify-between h-28 gap-2">
              {forecast.hourly_forecast.map(h => (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className={`w-full rounded-md ${h.predicted_occupancy_pct >= 70 ? "bg-red-500" : "bg-[#131b2e]"}`} style={{ height: `${Math.max(8, h.predicted_occupancy_pct)}%` }} />
                  <span className="text-[9px] text-[#76777d]">{h.hour}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border border-[#c6c6cd] bg-white rounded-2xl p-5 mb-6">
          <div className={styles.label}>Manual incentive</div>
          <div className="flex justify-between mb-2"><span className="text-sm text-[#45464d]">Discount level</span><span className="text-lg font-bold">{businessDiscount}%</span></div>
          <input type="range" min={5} max={40} value={businessDiscount} onChange={e => setBusinessDiscount(Number(e.target.value))} className="w-full accent-black mb-4" />
          <div className={styles.labelTight + " mb-1"}>Offer message</div>
          <input placeholder="e.g. FLASH SALE" className={styles.input + " mb-4"} />
          <div className={styles.labelTight + " mb-1"}>Special offer</div>
          <input placeholder="e.g. Free hair wash or styling" value={businessOffer} onChange={e => setBusinessOffer(e.target.value)} className={styles.input + " mb-4"} />
          <button className="w-full bg-black text-white rounded-full py-3 text-sm font-bold uppercase tracking-widest">Push Live Offer</button>
          {businessOffer && <div className="mt-3 bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl p-3 text-xs font-semibold text-[#166534]">✦ Active: {businessOffer}</div>}
        </div>

        <div className="border border-[#c6c6cd] bg-white rounded-2xl p-5">
          <div className="flex justify-between items-baseline mb-3"><div className={styles.labelTight}>Recent reviews</div><button className="text-xs font-semibold text-black">View all</button></div>
          <div className="flex flex-col divide-y divide-[#e4e2e4]">
            {SHOPS[0].reviews_list.map((r, i) => (
              <div key={i} className="py-4 first:pt-0 last:pb-0">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-black rounded-full flex items-center justify-center text-white text-xs font-bold">{r.author[0]}</div>
                    <span className="text-sm font-semibold">{r.author}</span>
                  </div>
                  <span className="text-xs text-[#76777d]">{r.date}</span>
                </div>
                <Stars n={r.rating} />
                <div className="text-sm text-[#45464d] mt-1">{r.comment}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomNav active="home" items={OWNER_NAV} onNav={setPage} />
    </div>
  );

  return null;
}
