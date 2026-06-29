import { useState, useEffect, useRef, TouchEvent as ReactTouchEvent } from "react";
import { Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from "recharts";

const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000/api";

const SHOP_IMG = "https://lh3.googleusercontent.com/aida-public/AB6AXuAYE_1RlMii-zwce5xoGe-_AQcyhNC2MXXnCLHRugYZbYbJfbwUl2C79ouJpms8hK78JGeZIs-Z9EvC3ItKSxOL73mJMBDrI9QPkv4qJlBX5jjCPb9SXuMKBN9aN2MP4aFGyltoFpFNZJJOikKUxV1aLIb8zfEIYeJt_DBp7EcbNvaaJ-9zcv1rnJm8kKpW8AHf2uit4kFv0qshYxb_tDLEwfm6IWI0cghWzWf50aaO0VYBQGPiaK1rQg6_b2VrFYF2ks5GxdjBOPo";
const AVATAR_IMG = "https://lh3.googleusercontent.com/aida-public/AB6AXuDHl-KjFHqbsHCO04mxY4Gzz0a9FXXUrhDZL_v0y_8bNahG7BwbqgoY9HBhC6zKl_LbyT431EOHHF7yJrluLPWjJX5FfzvOJl9uHPUw3RAbBmFIHecmmW--VXAF4-9k1mQjJ07gErIvECBGLst1ML0Zy3xcKSolQkW4VW17aidWczXj_KRdxaDEpeqc6QsmYz3eCvL9_-HGJYYP89bGgYPSHMt_lXCqX-VimKq1Ny-A1Q0kWGStuve5abixy0JkeQPBL-eZm5a6PjE";

type Slot = { id: string; start_time: string; end_time: string; service: string; base_price: number; incentive_price: number | null; incentive_label: string | null; is_peak: boolean; is_booked: boolean; };
type Booking = { booking_id: string; customer_name: string; service: string; start_time: string; price_paid: number; incentive_applied: boolean; message: string; customer_phone?: string; customer_email?: string; payment_method?: string; customer_segment?: "New" | "Returning"; };
type SavedBooking = Booking & { shopName: string; shopLocation: string };
type ForecastReport = { shop_name: string; date: string; overall_summary: string; peak_warning: string; suggested_action: string; hourly_forecast: { hour: string; predicted_occupancy_pct: number; is_peak: boolean; forecast_label: string }[]; };
type RevenuePoint = { label: string; revenue: number };
type RevenueBreakdown = { today_total: number; today_by_hour: RevenuePoint[]; month_total: number; month_by_week: RevenuePoint[]; year_total: number; year_by_month: RevenuePoint[] };
type OffpeakDeal = { deal_name: string; time_slot: string; customer_segment: string };
type HistoricalDay = { date: string; total_bookings: number; revenue: number; offpeak_deals: number; avg_rating: number };
type WeeklyStrategy = { available: boolean; recommendations: string[] };
type User = { name: string; email: string; phone: string; type: "customer" | "business"; payment?: string };
type Shop = { id: string; name: string; location: string; distance: string; rating: number; reviews: number; services: string[]; basePrice: number; favourite: boolean; tag?: string; lat: number; lng: number; image: string; reviews_list: { author: string; rating: number; comment: string; date: string }[]; };
type Page = "splash" | "signup-type" | "signup-customer" | "signup-business" | "login" | "landing" | "shop" | "booking-confirm" | "owner-dashboard" | "leave-review" | "browse" | "profile" | "bookings" | "favorites" | "owner-bookings" | "owner-data" | "owner-account";

const BACK_TARGETS: Partial<Record<Page, Page>> = {
  "signup-type": "splash",
  "signup-customer": "signup-type",
  "signup-business": "signup-type",
  "login": "splash",
  "shop": "landing",
  "leave-review": "booking-confirm",
  "browse": "landing",
  "favorites": "landing",
  "owner-bookings": "owner-dashboard",
  "owner-data": "owner-dashboard",
  "owner-account": "owner-dashboard",
};

const SHOP_IMAGES = [
  "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400",
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400",
  "https://images.unsplash.com/photo-1521490683712-35a1cb235d1c?w=400",
];

const SHOPS_DATA: Omit<Shop, "image">[] = [
  { id: "kens", name: "Ken's Barbershop", location: "Tanjong Pagar", distance: "0.3km", rating: 4.8, reviews: 124, services: ["Haircut", "Shave", "Haircut + Shave"], basePrice: 30, favourite: true, tag: "Closest", lat: 1.2763, lng: 103.8440, reviews_list: [{ author: "Wei Jie", rating: 5, comment: "Great cut, booked the off-peak slot and saved $6. Will come back.", date: "2 days ago" }, { author: "Rajan S.", rating: 5, comment: "Best barbershop in Tanjong Pagar. Always clean and on time.", date: "1 week ago" }, { author: "Marcus L.", rating: 4, comment: "Good experience, the AI deal for 9am was a nice touch.", date: "2 weeks ago" }] },
  { id: "upper", name: "Upper Cut SG", location: "Telok Ayer", distance: "0.7km", rating: 4.6, reviews: 89, services: ["Haircut", "Beard Trim", "Hair Wash"], basePrice: 28, favourite: false, tag: "Popular", lat: 1.2817, lng: 103.8461, reviews_list: [{ author: "Daniel T.", rating: 5, comment: "Friendly staff, quick service.", date: "3 days ago" }, { author: "Priya M.", rating: 4, comment: "Good value, the 20% deal made it worth coming at 10am.", date: "1 week ago" }] },
  { id: "fade", name: "Fade Studio", location: "Chinatown", distance: "0.9km", rating: 4.5, reviews: 67, services: ["Haircut", "Fade", "Styling"], basePrice: 35, favourite: false, tag: "Top Rated", lat: 1.2838, lng: 103.8435, reviews_list: [{ author: "Jason K.", rating: 5, comment: "Specialise in fades. Booked via Slotly easily.", date: "5 days ago" }] },
  { id: "orchard", name: "The Gent's Den", location: "Orchard", distance: "1.2km", rating: 4.7, reviews: 156, services: ["Haircut", "Beard Trim", "Hot Towel Shave"], basePrice: 38, favourite: true, lat: 1.3048, lng: 103.8318, reviews_list: [{ author: "Ethan N.", rating: 5, comment: "Premium feel, great hot towel shave.", date: "4 days ago" }] },
  { id: "tiongbahru", name: "Tiong Bahru Barber Co.", location: "Tiong Bahru", distance: "1.5km", rating: 4.6, reviews: 98, services: ["Haircut", "Buzz Cut"], basePrice: 26, favourite: false, lat: 1.2847, lng: 103.8267, reviews_list: [{ author: "Mei Ling", rating: 5, comment: "Quick and affordable, near the market.", date: "1 week ago" }] },
  { id: "hollandv", name: "Holland Village Clippers", location: "Holland Village", distance: "2.1km", rating: 4.4, reviews: 72, services: ["Haircut", "Kids Cut"], basePrice: 25, favourite: false, lat: 1.3113, lng: 103.7964, reviews_list: [{ author: "Sam T.", rating: 4, comment: "Good for a quick kids cut on weekends.", date: "2 weeks ago" }] },
  { id: "bugis", name: "Bugis Fade House", location: "Bugis", distance: "1.8km", rating: 4.5, reviews: 110, services: ["Haircut", "Fade", "Line Up"], basePrice: 27, favourite: false, lat: 1.3008, lng: 103.8559, reviews_list: [{ author: "Hafiz R.", rating: 5, comment: "Best fades in the Bugis area, hands down.", date: "3 days ago" }] },
  { id: "joochiat", name: "Joo Chiat Old School Barber", location: "Joo Chiat", distance: "3.2km", rating: 4.8, reviews: 64, services: ["Haircut", "Shave", "Hair Tonic Treatment"], basePrice: 24, favourite: false, lat: 1.311, lng: 103.903, reviews_list: [{ author: "Kenneth O.", rating: 5, comment: "Old-school vibe, the hair tonic treatment is excellent.", date: "6 days ago" }] },
  { id: "katong", name: "Katong Grooming Lounge", location: "Katong", distance: "3.0km", rating: 4.3, reviews: 51, services: ["Haircut", "Beard Trim"], basePrice: 28, favourite: false, lat: 1.3047, lng: 103.9036, reviews_list: [{ author: "Aaron P.", rating: 4, comment: "Relaxed atmosphere, solid beard trim.", date: "1 week ago" }] },
  { id: "boatquay", name: "Boat Quay Barbers", location: "Boat Quay", distance: "0.8km", rating: 4.6, reviews: 87, services: ["Haircut", "Executive Grooming"], basePrice: 40, favourite: false, lat: 1.2868, lng: 103.8493, reviews_list: [{ author: "Ryan C.", rating: 5, comment: "Great for a lunchtime cut near the office.", date: "2 days ago" }] },
  { id: "clarkequay", name: "Clarke Quay Cuts", location: "Clarke Quay", distance: "1.0km", rating: 4.2, reviews: 45, services: ["Haircut", "Hair Wash"], basePrice: 26, favourite: false, lat: 1.2906, lng: 103.8467, reviews_list: [{ author: "Joel S.", rating: 4, comment: "Convenient location, decent service.", date: "5 days ago" }] },
  { id: "rafflesplace", name: "Raffles Place Barber Bar", location: "Raffles Place", distance: "0.5km", rating: 4.7, reviews: 132, services: ["Haircut", "Lunch Express Cut"], basePrice: 32, favourite: true, lat: 1.284, lng: 103.851, reviews_list: [{ author: "Vincent L.", rating: 5, comment: "Fast express cuts, perfect for lunch breaks.", date: "1 day ago" }] },
  { id: "dempsey", name: "Dempsey Hill Grooming House", location: "Dempsey Hill", distance: "4.5km", rating: 4.9, reviews: 60, services: ["Haircut", "Shave", "Scalp Treatment"], basePrice: 45, favourite: false, lat: 1.3037, lng: 103.812, reviews_list: [{ author: "Marcus W.", rating: 5, comment: "Top-tier service, worth the price.", date: "1 week ago" }] },
  { id: "tampines", name: "Tampines Hub Barbers", location: "Tampines", distance: "12km", rating: 4.1, reviews: 88, services: ["Haircut", "Kids Cut"], basePrice: 20, favourite: false, lat: 1.353, lng: 103.945, reviews_list: [{ author: "Farah A.", rating: 4, comment: "Good value, easy to bring the kids.", date: "3 days ago" }] },
  { id: "bishan", name: "Bishan Classic Cuts", location: "Bishan", distance: "8km", rating: 4.4, reviews: 70, services: ["Haircut", "Beard Trim"], basePrice: 22, favourite: false, lat: 1.3508, lng: 103.8485, reviews_list: [{ author: "Desmond K.", rating: 4, comment: "Reliable neighbourhood barber.", date: "4 days ago" }] },
  { id: "toapayoh", name: "Toa Payoh Heritage Barber", location: "Toa Payoh", distance: "7.5km", rating: 4.5, reviews: 58, services: ["Haircut", "Shave"], basePrice: 18, favourite: false, lat: 1.3343, lng: 103.8563, reviews_list: [{ author: "Benjamin H.", rating: 5, comment: "Heritage shop with old-school skills.", date: "2 weeks ago" }] },
  { id: "amk", name: "Ang Mo Kio Fade Studio", location: "Ang Mo Kio", distance: "10km", rating: 4.0, reviews: 40, services: ["Haircut", "Fade"], basePrice: 19, favourite: false, lat: 1.3691, lng: 103.8454, reviews_list: [{ author: "Zhi Hao", rating: 4, comment: "Decent fades for the price.", date: "1 week ago" }] },
  { id: "jurongeast", name: "Jurong East Grooming Co.", location: "Jurong East", distance: "15km", rating: 4.3, reviews: 65, services: ["Haircut", "Beard Trim", "Hair Colour"], basePrice: 23, favourite: false, lat: 1.3329, lng: 103.7436, reviews_list: [{ author: "Wendy F.", rating: 4, comment: "Tried the hair colour service, happy with the result.", date: "5 days ago" }] },
  { id: "punggol", name: "Punggol Waterway Barbers", location: "Punggol", distance: "16km", rating: 4.6, reviews: 53, services: ["Haircut", "Kids Cut"], basePrice: 21, favourite: false, lat: 1.4043, lng: 103.9021, reviews_list: [{ author: "Nur Aisyah", rating: 5, comment: "Lovely shop near the waterway, great with kids.", date: "6 days ago" }] },
  { id: "novena", name: "Novena Precision Cuts", location: "Novena", distance: "6km", rating: 4.7, reviews: 102, services: ["Haircut", "Executive Grooming", "Hot Towel Shave"], basePrice: 35, favourite: false, lat: 1.3203, lng: 103.8439, reviews_list: [{ author: "Timothy G.", rating: 5, comment: "Precise cuts, very professional.", date: "2 days ago" }] },
];

const SHOPS: Shop[] = SHOPS_DATA.map((s, i) => ({ ...s, image: SHOP_IMAGES[i % 3] }));

const CUSTOMER_NAV: { key: string; label: string; icon: string; page?: Page }[] = [
  { key: "search", label: "Search", icon: "search", page: "landing" },
  { key: "bookings", label: "Bookings", icon: "calendar_month", page: "bookings" },
  { key: "favorites", label: "Favorites", icon: "favorite", page: "favorites" },
  { key: "profile", label: "Profile", icon: "person", page: "profile" },
];
const OWNER_NAV: { key: string; label: string; icon: string; page?: Page }[] = [
  { key: "home", label: "Home", icon: "home", page: "owner-dashboard" },
  { key: "bookings", label: "Bookings", icon: "calendar_month", page: "owner-bookings" },
  { key: "data", label: "Data", icon: "bar_chart", page: "owner-data" },
  { key: "account", label: "Account", icon: "person", page: "owner-account" },
];

// Hardcoded for promo-video recording — no live API call, so the dashboard
// renders instantly with no loading flicker on camera.
const DEMO_METRICS: { key: string; label: string; value: string; delta: string; context: string; fallback: string }[] = [
  { key: "Bookings filled", label: "Bookings filled", value: "11/12", delta: "+18% vs last Saturday", context: "11 of 12 slots booked today, up sharply from a typical Saturday; the 20% off-peak promotion was applied to morning slots.", fallback: "Strong weekend demand driven by your 20% off-peak promotion pushed morning slots to near-full capacity." },
  { key: "Revenue", label: "Revenue", value: "$312", delta: "+$64 vs yesterday", context: "Today's projected revenue is $312, $64 higher than yesterday; 4 customers upgraded from a Haircut to the Haircut + Shave bundle.", fallback: "Higher average spend per customer today — 4 customers upgraded to Haircut + Shave after seeing the bundle deal." },
  { key: "Off-peak deals", label: "Off-peak deals", value: "5", delta: "3 new customers acquired", context: "5 off-peak deals were redeemed today, and 3 of those customers were booking with this shop for the first time.", fallback: "3 first-time customers booked off-peak slots this morning, suggesting your quiet-hours pricing is attracting new clientele." },
];

const DEMO_DEMAND_DATA: { hour: string; predicted: number; actual: number }[] = [
  { hour: "09:00", predicted: 25, actual: 20 },
  { hour: "10:00", predicted: 35, actual: 30 },
  { hour: "11:00", predicted: 30, actual: 35 },
  { hour: "12:00", predicted: 88, actual: 92 },
  { hour: "13:00", predicted: 90, actual: 95 },
  { hour: "14:00", predicted: 45, actual: 40 },
  { hour: "15:00", predicted: 35, actual: 30 },
  { hour: "16:00", predicted: 40, actual: 45 },
  { hour: "17:00", predicted: 82, actual: 85 },
  { hour: "18:00", predicted: 90, actual: 95 },
  { hour: "19:00", predicted: 88, actual: 92 },
  { hour: "20:00", predicted: 80, actual: 85 },
];

// Hardcoded for promo-video recording — realistic Singapore customers, no live fetch.
const DEMO_BOOKINGS: Booking[] = [
  { booking_id: "demo-1", customer_name: "Wei Jie Tan", service: "Haircut", start_time: "2026-06-27T09:15:00", price_paid: 24, incentive_applied: true, message: "Booking confirmed for Wei Jie Tan! You saved $6.0 by booking during quiet hours.", customer_phone: "+65 9123 4561", customer_email: "weijie.tan@example.com", payment_method: "apple-pay", customer_segment: "Returning" },
  { booking_id: "demo-2", customer_name: "Rajan Subramaniam", service: "Shave", start_time: "2026-06-27T10:30:00", price_paid: 16, incentive_applied: true, message: "Booking confirmed for Rajan Subramaniam! You saved $4.0 by booking during quiet hours.", customer_phone: "+65 9123 4562", customer_email: "rajan.s@example.com", payment_method: "card", customer_segment: "New" },
  { booking_id: "demo-3", customer_name: "Marcus Lim", service: "Haircut + Shave", start_time: "2026-06-27T12:15:00", price_paid: 45, incentive_applied: false, message: "Booking confirmed for Marcus Lim! See you at 12:15 PM.", customer_phone: "+65 9123 4563", customer_email: "marcus.lim@example.com", payment_method: "cash", customer_segment: "Returning" },
  { booking_id: "demo-4", customer_name: "Daniel Teo", service: "Haircut", start_time: "2026-06-27T13:00:00", price_paid: 30, incentive_applied: false, message: "Booking confirmed for Daniel Teo! See you at 01:00 PM.", customer_phone: "+65 9123 4564", customer_email: "daniel.teo@example.com", payment_method: "apple-pay", customer_segment: "New" },
  { booking_id: "demo-5", customer_name: "Jason Koh", service: "Haircut", start_time: "2026-06-27T14:30:00", price_paid: 24, incentive_applied: true, message: "Booking confirmed for Jason Koh! You saved $6.0 by booking during quiet hours.", customer_phone: "+65 9123 4565", customer_email: "jason.koh@example.com", payment_method: "cash", customer_segment: "New" },
  { booking_id: "demo-6", customer_name: "Priya Menon", service: "Haircut + Shave", start_time: "2026-06-27T17:15:00", price_paid: 45, incentive_applied: false, message: "Booking confirmed for Priya Menon! See you at 05:15 PM.", customer_phone: "+65 9123 4566", customer_email: "priya.menon@example.com", payment_method: "card", customer_segment: "Returning" },
  { booking_id: "demo-7", customer_name: "Ethan Wong", service: "Shave", start_time: "2026-06-27T18:00:00", price_paid: 20, incentive_applied: false, message: "Booking confirmed for Ethan Wong! See you at 06:00 PM.", customer_phone: "+65 9123 4567", customer_email: "ethan.wong@example.com", payment_method: "apple-pay", customer_segment: "Returning" },
  { booking_id: "demo-8", customer_name: "Amirul Hakim", service: "Haircut", start_time: "2026-06-27T19:30:00", price_paid: 30, incentive_applied: false, message: "Booking confirmed for Amirul Hakim! See you at 07:30 PM.", customer_phone: "+65 9123 4568", customer_email: "amirul.hakim@example.com", payment_method: "cash", customer_segment: "New" },
];

function Icon({ name, className = "", filled = false }: { name: string; className?: string; filled?: boolean }) {
  return <span className={`material-symbols-outlined ${className}`} style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24` }}>{name}</span>;
}

function RatingBadge({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5 text-xs font-bold shrink-0">
      <span className="material-symbols-outlined text-amber-500 text-sm" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>star</span>
      {rating}
    </span>
  );
}

function tagStyle(tag?: string) {
  if (tag === "Closest") return "bg-blue-500 text-white";
  if (tag === "Popular") return "bg-amber-500 text-white";
  if (tag === "Top Rated") return "bg-[#22C55E] text-white";
  return "bg-[#e4e2e4] text-[#45464d]";
}

function paymentBadge(method?: string) {
  if (method === "apple-pay" || method === "card") return { label: "Paid online", className: "bg-[#F0FDF4] text-[#166534]" };
  if (method === "cash") return { label: "Pay in store", className: "bg-amber-100 text-amber-800" };
  return { label: "Unknown", className: "bg-[#e4e2e4] text-[#45464d]" };
}

function Stars({ n }: { n: number }) {
  return <div className="flex gap-0.5">{[1,2,3,4,5].map(i => <span key={i} className="material-symbols-outlined text-amber-500 text-sm" style={{ fontVariationSettings: `'FILL' ${i <= n ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24` }}>star</span>)}</div>;
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center mt-2">
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#76777d]" />
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#76777d]" />
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#76777d]" />
    </div>
  );
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

const API_ROOT = API.replace(/\/api\/?$/, "");

export default function App() {
  const [page, setPage] = useState<Page>("splash");
  const [user, setUser] = useState<User | null>(null);
  const [serverReady, setServerReady] = useState(false);
  const [showWakingBanner, setShowWakingBanner] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop>(SHOPS[0]);
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set(SHOPS.filter(s => s.favourite).map(s => s.id)));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [offerApplied, setOfferApplied] = useState(false);
  const [browseSearch, setBrowseSearch] = useState("");
  const [browseSort, setBrowseSort] = useState<"distance" | "favourited" | "rating">("distance");
  const [browseMinRating, setBrowseMinRating] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [confirmation, setConfirmation] = useState<Booking | null>(null);
  const [bookings, setBookings] = useState<SavedBooking[]>([]);
  const [forecast, setForecast] = useState<ForecastReport | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("apple-pay");
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingRevenue, setLoadingRevenue] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [businessDiscount, setBusinessDiscount] = useState(20);
  const [offerStartTime, setOfferStartTime] = useState("14:00");
  const [offerEndTime, setOfferEndTime] = useState("17:00");
  const [offPeakSelectedHours, setOffPeakSelectedHours] = useState<Set<string>>(new Set(["14:00", "15:00", "16:00"]));
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", bizName: "", location: "", service: "", price: "" });
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdown | null>(null);
  const [revenueTab, setRevenueTab] = useState<"today" | "month" | "year">("today");
  const [offpeakDeals, setOffpeakDeals] = useState<OffpeakDeal[]>([]);
  const [metricExplanations, setMetricExplanations] = useState<Record<string, string>>({});
  const [metricExplanationsLoading, setMetricExplanationsLoading] = useState<Record<string, boolean>>({});
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalDay[]>([]);
  const [weeklyStrategy, setWeeklyStrategy] = useState<WeeklyStrategy | null>(null);
  const [loadingStrategy, setLoadingStrategy] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  useEffect(() => {
    // Render's free tier spins the backend down after idle — fire a silent warmup ping
    // as soon as the app loads so the cold start overlaps with the user reading the splash
    // screen instead of a fetch they're actively waiting on.
    let cancelled = false;
    const bannerTimer = setTimeout(() => { if (!cancelled) setShowWakingBanner(true); }, 800);
    fetch(`${API_ROOT}/`)
      .catch(() => {})
      .finally(() => {
        if (cancelled) return;
        clearTimeout(bannerTimer);
        setServerReady(true);
        setShowWakingBanner(false);
      });
    return () => { cancelled = true; clearTimeout(bannerTimer); };
  }, []);
  useEffect(() => {
    if (page === "shop") {
      setLoadingSlots(true);
      fetch(`${API}/slots?date=${selectedDate}`)
        .then(r => r.json())
        .then(setSlots)
        .finally(() => setLoadingSlots(false));
    }
  }, [page, selectedDate]);
  useEffect(() => { if (page === "owner-dashboard" || page === "owner-data") { setLoadingForecast(true); fetch(`${API}/slots/demand-forecast`).then(r => r.json()).then(d => { setForecast(d); setLoadingForecast(false); }); } }, [page]);
  useEffect(() => {
    if (page !== "owner-dashboard") return;
    setLoadingRevenue(true);
    fetch(`${API}/bookings/revenue-breakdown`).then(r => r.json()).then(setRevenueBreakdown).catch(() => setRevenueBreakdown(null)).finally(() => setLoadingRevenue(false));
    fetch(`${API}/bookings/offpeak-today`).then(r => r.json()).then(setOffpeakDeals).catch(() => setOffpeakDeals([]));

    setMetricExplanationsLoading(Object.fromEntries(DEMO_METRICS.map(m => [m.key, true])));
    DEMO_METRICS.forEach(m => {
      fetch(`${API}/dashboard/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric: m.label, value: m.value, change: m.delta, context: m.context }),
      })
        .then(r => { if (!r.ok) throw new Error("explain failed"); return r.json(); })
        .then(d => setMetricExplanations(prev => ({ ...prev, [m.key]: d.explanation })))
        .catch(() => setMetricExplanations(prev => ({ ...prev, [m.key]: m.fallback })))
        .finally(() => setMetricExplanationsLoading(prev => ({ ...prev, [m.key]: false })));
    });
  }, [page]);
  useEffect(() => {
    if (page !== "owner-data") return;
    fetch(`${API}/bookings/historical`).then(r => r.json()).then(setHistoricalData).catch(() => setHistoricalData([]));
    setLoadingStrategy(true);
    fetch(`${API}/bookings/weekly-strategy`)
      .then(r => r.json())
      .then(setWeeklyStrategy)
      .catch(() => setWeeklyStrategy({ available: false, recommendations: ["Strategic recommendations are unavailable right now."] }))
      .finally(() => setLoadingStrategy(false));
  }, [page]);

  async function handleBook() {
    if (!selectedSlot) return;
    setBooking(true);
    setBookingError(null);
    const res = await fetch(`${API}/bookings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slot_id: selectedSlot.id, customer_name: user?.name ?? "Guest", customer_phone: user?.phone ?? "", customer_email: user?.email ?? "", payment_method: paymentMethod, service: selectedSlot.service, date: selectedDate }) });
    const data = await res.json();
    setBooking(false);
    if (!res.ok) {
      setBookingError(data.detail || "Could not complete booking. Please try another slot.");
      return;
    }
    setConfirmation(data);
    setBookings(prev => [{ ...data, shopName: selectedShop.name, shopLocation: selectedShop.location }, ...prev]);
    setSlots(prev => prev.map(s => s.id === selectedSlot.id ? { ...s, is_booked: true } : s));
    setPage("booking-confirm");
  }

  function formatTime(iso: string) { return new Date(iso).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", hour12: true }); }
  function formatTimeOfDay(t: string) { const [h, m] = t.split(":").map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", hour12: true }); }

  function isFavourite(id: string) { return favouriteIds.has(id); }
  function toggleFavourite(id: string) {
    setFavouriteIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleOffPeakHour(hour: string) {
    setOffPeakSelectedHours(prev => {
      const next = new Set(prev);
      next.has(hour) ? next.delete(hour) : next.add(hour);
      return next;
    });
  }

  function goBack() {
    const target = BACK_TARGETS[page];
    if (!target) return;
    if (page === "shop") setOfferApplied(false);
    setPage(target);
  }

  const touchStartX = useRef<number | null>(null);
  function handleTouchStart(e: ReactTouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: ReactTouchEvent) {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (deltaX > 80) goBack();
  }

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
    <div key={page} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="min-h-screen bg-black flex flex-col items-center px-8 py-16 page-enter">
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
        {showWakingBanner && !serverReady && (
          <div className="flex items-center gap-2 text-[#76777d] text-xs mt-6">
            <Icon name="autorenew" className="text-sm animate-spin" />
            Waking up the server — this can take up to a minute on first load
          </div>
        )}
      </div>
      <div className="w-full max-w-xs flex flex-col gap-3">
        <button onClick={() => setPage("signup-type")} className="bg-white text-black rounded-full py-4 text-sm font-semibold">Get Started</button>
        <button onClick={() => setPage("login")} className="border border-[#45464d] text-white rounded-full py-4 text-sm font-semibold">Log In</button>
      </div>
    </div>
  );

  // ─── SIGNUP TYPE ───
  if (page === "signup-type") return (
    <div key={page} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className={styles.container + " page-enter"}>
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
    <div key={page} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className={styles.container + " page-enter"}>
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
    <div key={page} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className={styles.container + " page-enter"}>
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
            <input type="range" min={0} max={100} value={businessDiscount} onChange={e => setBusinessDiscount(Number(e.target.value))} className="w-full accent-black" />
            <div className="text-xs text-[#76777d] italic mt-1">Encourage bookings during slower hours with dynamic pricing.</div>
          </div>
          <div>
            <div className={styles.label}>Off-peak Time Slot</div>
            <div className="flex gap-3">
              <div className="flex-1"><div className="text-xs text-[#45464d] mb-1">From</div><input type="time" value={offerStartTime} onChange={e => setOfferStartTime(e.target.value)} className={styles.input} /></div>
              <div className="flex-1"><div className="text-xs text-[#45464d] mb-1">To</div><input type="time" value={offerEndTime} onChange={e => setOfferEndTime(e.target.value)} className={styles.input} /></div>
            </div>
          </div>
        </div>
        <button onClick={() => { setUser({ name: form.bizName || "Ken's Barbershop", email: form.email, phone: form.phone, type: "business" }); setPage("owner-dashboard"); }} className={styles.primaryBtn + " mb-6"}>Open My Shop 🚀</button>
        <div className="text-center text-[10px] text-[#76777d]">© 2026 Slotly Business. Secure data processing compliant with global standards.</div>
      </div>
    </div>
  );

  // ─── LOGIN ───
  if (page === "login") return (
    <div key={page} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className={styles.container + " page-enter"}>
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
    <div key={page} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className={styles.container + " page-enter"}>
      <header className={styles.header}>
        <span className={styles.headerTitle}>Slotly</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#45464d]">Hi, {user?.name?.split(" ")[0]}</span>
          <div className="w-9 h-9 rounded-full overflow-hidden border border-[#c6c6cd]"><img src={AVATAR_IMG} alt="" className="w-full h-full object-cover" /></div>
        </div>
      </header>
      <div className="pt-20 px-5 pb-28">
        <div className="text-3xl font-bold tracking-tight mb-5">Welcome back, {user?.name?.split(" ")[0] ?? "there"}</div>

        <div className="relative rounded-2xl overflow-hidden h-44 mb-6">
          <Map
            mapId="slotly-map"
            defaultCenter={{ lat: 1.2763, lng: 103.8440 }}
            defaultZoom={14}
            gestureHandling="greedy"
            disableDefaultUI={true}
            style={{ width: "100%", height: "100%" }}
          >
            {SHOPS.map(shop => (
              <AdvancedMarker
                key={shop.id}
                position={{ lat: shop.lat, lng: shop.lng }}
              />
            ))}
          </Map>
          <span className="absolute top-3 left-3 bg-white rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1 z-10">
            <Icon name="location_on" className="text-sm text-red-500" />Tanjong Pagar
          </span>
        </div>

        <div className="flex justify-between items-baseline mb-3"><div className="font-bold text-lg">Curated Offers</div><button onClick={() => setPage("browse")} className="text-xs font-semibold text-[#45464d]">View All</button></div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar mb-8 -mx-5 px-5">
          <div className="relative shrink-0 w-64 h-40 rounded-2xl overflow-hidden">
            <img src={SHOPS[0].image} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <span className="absolute top-3 left-3 bg-white/90 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase">Member Exclusive</span>
            <div className="absolute bottom-3 left-3 right-3 text-white">
              <div className="font-bold text-sm mb-2">{SHOPS[0].name}: Complimentary Wash</div>
              <button onClick={() => { setSelectedShop(SHOPS[0]); setOfferApplied(true); setPage("shop"); }} className="bg-white text-black rounded-full px-3 py-1.5 text-xs font-semibold">Claim Offer</button>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-baseline mb-3"><div className="font-bold text-lg">Favourited Destinations</div></div>
        <div className="flex flex-col gap-3 mb-8">
          {SHOPS.filter(s => isFavourite(s.id)).map(shop => (
            <button key={shop.id} onClick={() => { setSelectedShop(shop); setOfferApplied(false); setPage("shop"); }} className="flex items-center gap-3 border border-[#c6c6cd] rounded-2xl p-3 text-left">
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0"><img src={shop.image} alt="" className="w-full h-full object-cover" /></div>
              <div className="flex-1"><div className="font-semibold text-sm">{shop.name}</div><div className="text-xs text-[#45464d]">{shop.location} · {shop.distance}</div></div>
              <div className="flex items-center gap-2">
                <RatingBadge rating={shop.rating} />
                <Icon name="favorite" className="text-red-500" filled />
              </div>
            </button>
          ))}
          {SHOPS.filter(s => isFavourite(s.id)).length === 0 && (
            <div className="text-sm text-[#76777d]">No favourites yet — tap the heart on a shop page to save it here.</div>
          )}
        </div>

        <div className="flex justify-between items-baseline mb-3"><div className="font-bold text-lg">Nearby You</div></div>
        <div className="flex flex-col gap-3">
          {SHOPS.map(shop => (
            <button key={shop.id} onClick={() => { setSelectedShop(shop); setOfferApplied(false); setPage("shop"); }} className="flex items-center gap-3 border border-[#c6c6cd] rounded-2xl p-3 text-left">
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0"><img src={shop.image} alt="" className="w-full h-full object-cover" /></div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{shop.name}</div>
                <div className="text-xs text-[#45464d]">{shop.location} · {shop.distance}</div>
              </div>
              <div className="flex items-center gap-2">
                <RatingBadge rating={shop.rating} />
                {shop.tag && <span className={`text-[11px] font-bold uppercase tracking-widest rounded-full px-3 py-1 ${tagStyle(shop.tag)}`}>{shop.tag}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
      <BottomNav active="search" items={CUSTOMER_NAV} onNav={setPage} />
    </div>
  );

  // ─── BROWSE ALL ───
  if (page === "browse") {
    const filtered = SHOPS.filter(shop => {
      const q = browseSearch.trim().toLowerCase();
      if (q && !(shop.name.toLowerCase().includes(q) || shop.location.toLowerCase().includes(q))) return false;
      return shop.rating >= browseMinRating;
    }).sort((a, b) => {
      if (browseSort === "distance") return parseFloat(a.distance) - parseFloat(b.distance);
      if (browseSort === "favourited") return Number(isFavourite(b.id)) - Number(isFavourite(a.id));
      return b.rating - a.rating;
    });
    return (
      <div key={page} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className={styles.container + " page-enter"}>
        <header className={styles.header}>
          <button onClick={() => setPage("landing")}><Icon name="arrow_back" /></button>
          <span className={styles.headerTitle}>Slotly</span>
          <div className="w-8" />
        </header>
        <div className="pt-20 px-5 pb-10">
          <div className="text-2xl font-bold tracking-tight mb-1">All Barbershops</div>
          <div className="text-sm text-[#45464d] mb-5">{filtered.length} of {SHOPS.length} shops</div>
          <div className="border border-[#c6c6cd] bg-white flex items-center gap-3 px-4 py-3 rounded-full mb-6">
            <Icon name="search" className="text-[#76777d]" />
            <input
              value={browseSearch}
              onChange={e => setBrowseSearch(e.target.value)}
              placeholder="Search by name or location..."
              className="flex-1 text-sm bg-transparent focus:outline-none placeholder-[#76777d]"
            />
            {browseSearch && (
              <button onClick={() => setBrowseSearch("")}><Icon name="close" className="text-[#76777d] text-sm" /></button>
            )}
          </div>
          <div className={styles.labelTight + " mb-2"}>Sort by</div>
          <div className="flex gap-2 mb-4">
            {([["distance", "Distance"], ["favourited", "Favourited"], ["rating", "Rating"]] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setBrowseSort(val)}
                className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${browseSort === val ? "bg-black text-white border-black" : "bg-white text-[#45464d] border-[#c6c6cd]"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={styles.labelTight + " mb-2"}>Minimum rating</div>
          <div className="flex gap-2 mb-6">
            {[0, 3.5, 4, 4.5].map(threshold => (
              <button
                key={threshold}
                onClick={() => setBrowseMinRating(threshold)}
                className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${browseMinRating === threshold ? "bg-black text-white border-black" : "bg-white text-[#45464d] border-[#c6c6cd]"}`}
              >
                {threshold === 0 ? "All" : `${threshold}+`}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            {filtered.map(shop => (
              <button key={shop.id} onClick={() => { setSelectedShop(shop); setOfferApplied(false); setPage("shop"); }} className="flex items-center gap-3 border border-[#c6c6cd] rounded-2xl p-3 text-left">
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0"><img src={shop.image} alt="" className="w-full h-full object-cover" /></div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{shop.name}</div>
                  <div className="text-xs text-[#45464d]">{shop.location} · {shop.distance}</div>
                </div>
                <div className="flex items-center gap-2">
                  <RatingBadge rating={shop.rating} />
                  {isFavourite(shop.id) && <Icon name="favorite" className="text-red-500" filled />}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="text-center text-sm text-[#76777d] py-10">No shops match "{browseSearch}"</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── PROFILE ───
  if (page === "profile") return (
    <div key={page} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className={styles.container + " page-enter"}>
      <header className={styles.header}>
        <span className={styles.headerTitle}>Slotly</span>
        <div className="w-8" />
      </header>
      <div className="pt-20 px-5 pb-28">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full overflow-hidden border border-[#c6c6cd] mb-4"><img src={AVATAR_IMG} alt="" className="w-full h-full object-cover" /></div>
          <div className="text-2xl font-bold tracking-tight">{user?.name ?? "Guest"}</div>
        </div>
        <div className="border border-[#c6c6cd] bg-white rounded-2xl p-5 mb-6 flex flex-col gap-4">
          <div>
            <div className={styles.labelTight + " mb-1"}>Email</div>
            <div className="text-sm font-medium">{user?.email || "—"}</div>
          </div>
          <div className="border-t border-[#e4e2e4] pt-4">
            <div className={styles.labelTight + " mb-1"}>Phone</div>
            <div className="text-sm font-medium">{user?.phone || "—"}</div>
          </div>
          <div className="border-t border-[#e4e2e4] pt-4">
            <div className={styles.labelTight + " mb-1"}>Payment method</div>
            <div className="text-sm font-medium">{user?.payment === "apple-pay" ? "Apple Pay" : user?.payment === "card" ? "Card" : user?.payment === "cash" ? "Cash on site" : "—"}</div>
          </div>
        </div>
        <button onClick={() => { setUser(null); setPage("splash"); }} className={styles.secondaryBtn}>Sign Out</button>
      </div>
      <BottomNav active="profile" items={CUSTOMER_NAV} onNav={setPage} />
    </div>
  );

  // ─── BOOKINGS ───
  if (page === "bookings") return (
    <div key={page} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className={styles.container + " page-enter"}>
      <header className={styles.header}>
        <span className={styles.headerTitle}>Slotly</span>
        <div className="w-8" />
      </header>
      <div className="pt-20 px-5 pb-28">
        <div className="text-2xl font-bold tracking-tight mb-5">My Bookings</div>
        {bookings.length === 0 ? (
          <div className="text-center text-sm text-[#76777d] py-16">No bookings yet — book a slot to see it here.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {[...bookings].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()).map(b => {
              const isPast = new Date(b.start_time).getTime() < Date.now();
              return (
                <div key={b.booking_id} className="border border-[#c6c6cd] bg-white rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-sm">{b.shopName}</div>
                    <div className="font-bold text-sm">${b.price_paid}</div>
                  </div>
                  <div className="text-xs text-[#45464d] mb-2">{b.shopLocation}</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-[#45464d]">
                      <span className="flex items-center gap-1"><Icon name="calendar_month" className="text-sm" />{new Date(b.start_time).toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short" })}</span>
                      <span className="flex items-center gap-1"><Icon name="schedule" className="text-sm" />{formatTime(b.start_time)}</span>
                      <span className="flex items-center gap-1"><Icon name="content_cut" className="text-sm" />{b.service}</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-2.5 py-1 ${isPast ? "bg-[#e4e2e4] text-[#45464d]" : "bg-[#131b2e] text-white"}`}>
                      {isPast ? "Completed" : "Upcoming"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav active="bookings" items={CUSTOMER_NAV} onNav={setPage} />
    </div>
  );

  // ─── FAVOURITES ───
  if (page === "favorites") {
    const favShops = SHOPS.filter(s => isFavourite(s.id));
    return (
      <div key={page} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className={styles.container + " page-enter"}>
        <header className={styles.header}>
          <span className={styles.headerTitle}>Slotly</span>
          <div className="w-8" />
        </header>
        <div className="pt-20 px-5 pb-28">
          <div className="text-2xl font-bold tracking-tight mb-5">Favourites</div>
          {favShops.length === 0 ? (
            <div className="text-center text-sm text-[#76777d] py-16">No favourites yet — tap the heart on a shop page to save it here.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {favShops.map(shop => (
                <div key={shop.id} role="button" tabIndex={0} onClick={() => { setSelectedShop(shop); setOfferApplied(false); setPage("shop"); }} onKeyDown={e => { if (e.key === "Enter") { setSelectedShop(shop); setOfferApplied(false); setPage("shop"); } }} className="flex items-center gap-3 border border-[#c6c6cd] rounded-2xl p-3 text-left cursor-pointer">
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0"><img src={shop.image} alt="" className="w-full h-full object-cover" /></div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{shop.name}</div>
                    <div className="text-xs text-[#45464d]">{shop.location} · {shop.distance}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RatingBadge rating={shop.rating} />
                    <button onClick={e => { e.stopPropagation(); toggleFavourite(shop.id); }} aria-label="Remove favourite">
                      <Icon name="favorite" className="text-red-500" filled />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <BottomNav active="favorites" items={CUSTOMER_NAV} onNav={setPage} />
      </div>
    );
  }

  // ─── SHOP PAGE ───
  if (page === "shop") return (
    <div key={page} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className={styles.container + " pb-10 page-enter"}>
      <header className={styles.header}>
        <button onClick={() => { setOfferApplied(false); setPage("landing"); }}><Icon name="arrow_back" /></button>
        <span className={styles.headerTitle}>Slotly</span>
        <div className="w-9 h-9 rounded-full overflow-hidden border border-[#c6c6cd]"><img src={AVATAR_IMG} alt="" className="w-full h-full object-cover" /></div>
      </header>
      <div className="pt-16">
        <div className="w-full h-48 overflow-hidden">
          <img src={selectedShop.image} alt={selectedShop.name} className="w-full h-full object-cover" />
        </div>
        <div className="px-5 -mt-6 relative z-10">
          <div className="bg-white border border-[#c6c6cd] rounded-2xl p-4 mb-4 shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xl font-bold tracking-tight">{selectedShop.name}</div>
                <div className="text-[#45464d] text-sm flex items-center gap-1 mt-1"><Icon name="location_on" className="text-sm" />{selectedShop.location}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleFavourite(selectedShop.id)} className="bg-[#e4e2e4] rounded-full p-2" aria-label="Toggle favourite">
                  <Icon name="favorite" className={`text-base ${isFavourite(selectedShop.id) ? "text-red-500" : "text-[#76777d]"}`} filled={isFavourite(selectedShop.id)} />
                </button>
                <div className="flex items-center gap-1 bg-[#e4e2e4] rounded-full px-2.5 py-1">
                  <span className="material-symbols-outlined text-amber-500 text-sm" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>star</span>
                  <span className="text-xs font-bold">{selectedShop.rating}</span>
                </div>
              </div>
            </div>
          </div>

          {offerApplied && (
            <div className={styles.dealCard + " flex items-center gap-3 mb-3"}>
              <div className="bg-[#22C55E] text-white rounded-full p-1.5"><Icon name="redeem" className="text-base" /></div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-[#166534]">Offer applied: Complimentary Wash</div>
                <div className="text-xs text-[#166534] opacity-80">100% off — added free when you book below</div>
              </div>
            </div>
          )}

          <div className={styles.dealCard + " flex items-center gap-3 mb-5"}>
            <div className="bg-[#22C55E] text-white rounded-full p-1.5"><Icon name="sell" className="text-base" /></div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-[#166534]">Off-peak Deal: 20% off</div>
              <div className="text-xs text-[#166534] opacity-80">Book quiet hour slots and save</div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-3">
            <div className="text-base font-bold">Available Slots</div>
            <input
              type="date"
              value={selectedDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={e => {
                setSelectedDate(e.target.value);
                setSelectedSlot(null);
                setBookingError(null);
              }}
              className="text-xs border border-[#c6c6cd] rounded-full px-3 py-1.5 text-[#45464d] focus:outline-none focus:border-black bg-white"
            />
          </div>

          {loadingSlots && slots.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-[#76777d] py-6 justify-center">
              <Icon name="autorenew" className="text-base animate-spin" />
              Loading available slots — first load can take up to a minute while the server wakes up.
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {slots.map(slot => (
              <button key={slot.id} disabled={slot.is_booked} onClick={() => { setSelectedSlot(slot); setBookingError(null); }}
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
              {bookingError && <div className="text-red-500 text-xs font-semibold mt-3 text-center">{bookingError}</div>}
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
    <div key={page} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className={styles.container + " px-5 pt-10 pb-16 page-enter"}>
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0"><img src={selectedShop.image} alt="" className="w-full h-full object-cover" /></div>
            <div className="flex items-center gap-1 text-sm font-medium"><Icon name="location_on" className="text-base" />{selectedShop.name}, {selectedShop.location}</div>
          </div>
        </div>
        <div className="border-t border-[#e4e2e4] pt-4 flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-widest text-[#76777d]">Payment Method</div>
          <div className="flex items-center gap-2 text-sm font-semibold"><Icon name="credit_card" className="text-base" />{paymentMethod === "apple-pay" ? "Apple Pay" : paymentMethod === "card" ? "Card" : "Cash on site"}</div>
        </div>
      </div>

      <button onClick={() => setPage("leave-review")} className={styles.primaryBtn + " mb-3"}>Leave a Review</button>
      <button onClick={() => { setSelectedSlot(null); setConfirmation(null); setPage("bookings"); }} className={styles.secondaryBtn + " mb-8"}>Go to My Bookings</button>

      <div className="flex justify-between items-baseline mb-3"><div className="font-bold">Location</div><button className="text-xs font-semibold text-[#45464d] underline">Get Directions</button></div>
      <div className="rounded-2xl overflow-hidden h-36">
        <Map
          mapId="slotly-confirm-map"
          defaultCenter={{ lat: 1.2763, lng: 103.8440 }}
          defaultZoom={15}
          gestureHandling="none"
          disableDefaultUI={true}
          style={{ width: "100%", height: "100%" }}
        >
          <AdvancedMarker position={{ lat: 1.2763, lng: 103.8440 }} />
        </Map>
      </div>
    </div>
  );

  // ─── LEAVE REVIEW ───
  if (page === "leave-review") return (
    <div key={page} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className={styles.container + " page-enter"}>
      <div className="px-5 pt-6"><button onClick={() => setPage("booking-confirm")}><Icon name="arrow_back" /></button></div>
      <div className="px-5 pt-4 pb-16">
        <div className="flex items-center gap-3 border border-[#c6c6cd] rounded-2xl p-3 mb-6">
          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0"><img src={selectedShop.image} alt="" className="w-full h-full object-cover" /></div>
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
  if (page === "owner-dashboard") {
    const currentHour = new Date().getHours();
    const demandData = DEMO_DEMAND_DATA.map(h => ({
      ...h,
      isNow: parseInt(h.hour.split(":")[0], 10) === currentHour,
    }));

    const revenueChartData = revenueTab === "today" ? (revenueBreakdown?.today_by_hour ?? [])
      : revenueTab === "month" ? (revenueBreakdown?.month_by_week ?? [])
      : (revenueBreakdown?.year_by_month ?? []);
    const revenueTotal = revenueTab === "today" ? revenueBreakdown?.today_total
      : revenueTab === "month" ? revenueBreakdown?.month_total
      : revenueBreakdown?.year_total;

    return (
    <div key={page} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className={styles.container + " page-enter"}>
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
          {DEMO_METRICS.map(m => {
            const isLoading = metricExplanationsLoading[m.key];
            const explanation = metricExplanations[m.key];
            return (
              <div key={m.key} className="py-4 border-b border-[#e4e2e4]">
                <div className="flex items-baseline justify-between">
                  <div><div className={styles.labelTight + " mb-1"}>{m.label}</div><div className="text-2xl font-bold">{m.value}</div></div>
                  <div className="text-xs font-semibold text-[#22C55E]">{m.delta}</div>
                </div>
                {isLoading ? <TypingDots /> : explanation ? (
                  <div key={explanation} className="fade-in text-xs text-[#45464d] mt-2 leading-relaxed">{explanation}</div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="bg-[#1b1b1d] rounded-2xl p-5 my-6 text-white">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#76777d] mb-3 flex items-center gap-1"><Icon name="auto_awesome" className="text-sm" />AI Forecast</div>
          {loadingForecast ? <div className="text-sm text-[#76777d]">Generating forecast...</div> : forecast ? (
            <>
              <p className="text-base italic leading-relaxed mb-4">"{forecast.suggested_action}"</p>
              <button onClick={() => setBusinessDiscount(Math.min(100, businessDiscount + 5))} className="border border-white/40 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest">Apply Offer</button>
            </>
          ) : <div className="text-sm text-[#76777d]">Could not load forecast</div>}
        </div>

        <div className="border border-[#c6c6cd] bg-white rounded-2xl p-5 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className={styles.labelTight}>Revenue</div>
            <div className="flex gap-1">
              {([["today", "Today"], ["month", "This Month"], ["year", "This Year"]] as const).map(([val, label]) => (
                <button key={val} onClick={() => setRevenueTab(val)} className={`px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-colors ${revenueTab === val ? "bg-black text-white border-black" : "bg-white text-[#45464d] border-[#c6c6cd]"}`}>{label}</button>
              ))}
            </div>
          </div>
          {revenueBreakdown ? (
            <>
              <div className="text-2xl font-bold mb-4">${revenueTotal}</div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={revenueChartData}>
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#76777d" }} />
                  <YAxis hide />
                  <Bar dataKey="revenue" fill="#1b1b1d" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : loadingRevenue ? <div className="text-sm text-[#76777d]">Loading revenue data...</div> : <div className="text-sm text-[#76777d]">Could not load revenue data</div>}
        </div>

        {forecast && (
          <div className="border border-[#c6c6cd] bg-white rounded-2xl p-5 mb-6">
            <div className="flex justify-between items-center mb-4">
              <div className={styles.labelTight}>Hourly demand</div>
              <div className="flex items-center gap-3 text-[10px] text-[#45464d]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#e4e2e4]" />Predicted</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#131b2e]" />Actual</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={demandData} margin={{ top: 16 }}>
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#76777d" }} />
                <YAxis hide domain={[0, 100]} />
                <Bar dataKey="predicted" fill="#e4e2e4" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="actual" fill="#131b2e" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                {demandData.find(d => d.isNow) && (
                  <ReferenceLine x={demandData.find(d => d.isNow)!.hour} stroke="#1b1b1d" strokeDasharray="3 3" label={{ value: "now", position: "top", fontSize: 9, fill: "#1b1b1d", fontWeight: 700 }} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="border border-[#c6c6cd] bg-white rounded-2xl p-5 mb-6">
          <div className={styles.label}>Manual incentive</div>
          <div className="flex justify-between mb-2"><span className="text-sm text-[#45464d]">Discount level</span><span className="text-lg font-bold">{businessDiscount}%</span></div>
          <input type="range" min={0} max={100} value={businessDiscount} onChange={e => setBusinessDiscount(Number(e.target.value))} className="w-full accent-black mb-4" />
          <div className={styles.labelTight + " mb-1"}>Offer message</div>
          <input placeholder="e.g. FLASH SALE" className={styles.input + " mb-4"} />
          <div className={styles.labelTight + " mb-2"}>Select time slots to apply discount</div>
          <div className="flex flex-wrap gap-2 mb-4">
            {DEMO_DEMAND_DATA.map(d => {
              const selected = offPeakSelectedHours.has(d.hour);
              return (
                <button
                  key={d.hour}
                  onClick={() => toggleOffPeakHour(d.hour)}
                  style={{ maxWidth: 80 }}
                  className={`flex-1 min-w-[64px] flex flex-col items-center justify-center px-2 py-1 rounded-xl text-xs font-semibold transition-colors ${selected ? "bg-black text-white" : "bg-white border border-black text-black"}`}
                >
                  <span>{formatTimeOfDay(d.hour)}</span>
                  <span className={`text-[10px] font-normal ${selected ? "text-white/70" : "text-[#76777d]"}`}>{businessDiscount}% off</span>
                </button>
              );
            })}
          </div>
          <button className="w-full bg-black text-white rounded-full py-3 text-sm font-bold uppercase tracking-widest">Push Live Offer</button>
          {offPeakSelectedHours.size > 0 && (
            <div className="mt-3 bg-[#F0FDF4] border border-[#DCFCE7] rounded-xl p-3 text-xs font-semibold text-[#166534]">
              ✦ Active: {businessDiscount}% off at {DEMO_DEMAND_DATA.map(d => d.hour).filter(h => offPeakSelectedHours.has(h)).map(formatTimeOfDay).join(", ")}
            </div>
          )}
        </div>

        <div className="border border-[#c6c6cd] bg-white rounded-2xl p-5 mb-6">
          <div className={styles.label}>Off-peak deals today</div>
          {offpeakDeals.length === 0 ? (
            <div className="text-sm text-[#76777d]">No off-peak deals used yet today.</div>
          ) : (
            <div className="flex flex-col divide-y divide-[#e4e2e4]">
              {offpeakDeals.map((d, i) => (
                <div key={i} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{d.deal_name}</div>
                    <div className="text-xs text-[#76777d]">{d.time_slot}</div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-2.5 py-1 ${d.customer_segment === "Returning customer" ? "bg-[#F0FDF4] text-[#166534]" : d.customer_segment === "New customer" ? "bg-[#e4e2e4] text-[#45464d]" : "bg-[#f6f3f5] text-[#76777d]"}`}>{d.customer_segment}</span>
                </div>
              ))}
            </div>
          )}
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
  }

  // ─── OWNER BOOKINGS ───
  if (page === "owner-bookings") return (
    <div key={page} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className={styles.container + " page-enter"}>
      <header className={styles.header}>
        <span className={styles.headerTitle}>Slotly</span>
        <div className="w-8" />
      </header>
      <div className="pt-20 px-5 pb-28">
        <div className="text-2xl font-bold tracking-tight mb-1">Today's Bookings</div>
        <div className="text-sm text-[#45464d] mb-5">{DEMO_BOOKINGS.length} confirmed booking{DEMO_BOOKINGS.length === 1 ? "" : "s"} today</div>
        {DEMO_BOOKINGS.length === 0 ? (
          <div className="text-center text-sm text-[#76777d] py-16">No confirmed bookings yet today.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {DEMO_BOOKINGS.map(b => {
              const badge = paymentBadge(b.payment_method);
              const expanded = expandedBookingId === b.booking_id;
              return (
                <div key={b.booking_id} role="button" tabIndex={0} onClick={() => setExpandedBookingId(expanded ? null : b.booking_id)} className="border border-[#c6c6cd] bg-white rounded-2xl p-4 cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-sm">{b.customer_name}</div>
                    <div className="font-bold text-sm">${b.price_paid}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-[#45464d]">
                      <span className="flex items-center gap-1"><Icon name="schedule" className="text-sm" />{formatTime(b.start_time)}</span>
                      <span className="flex items-center gap-1"><Icon name="content_cut" className="text-sm" />{b.service}</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest rounded-full px-2.5 py-1 ${badge.className}`}>{badge.label}</span>
                  </div>
                  {expanded && (
                    <div className="mt-3 pt-3 border-t border-[#e4e2e4] flex flex-col gap-1.5 text-xs text-[#45464d]">
                      <span className="flex items-center gap-1"><Icon name="mail" className="text-sm" />{b.customer_email || "—"}</span>
                      <span className="flex items-center gap-1"><Icon name="call" className="text-sm" />{b.customer_phone || "—"}</span>
                      <span className="flex items-center gap-1"><Icon name="credit_card" className="text-sm" />{b.payment_method === "apple-pay" ? "Apple Pay" : b.payment_method === "card" ? "Card" : "Cash"}</span>
                      <span className="flex items-center gap-1"><Icon name="person" className="text-sm" />{b.customer_segment ?? "—"} customer</span>
                      <span className="flex items-center gap-1"><Icon name="calendar_month" className="text-sm" />{new Date(b.start_time).toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long" })}</span>
                      {b.incentive_applied && <span className="text-[#166534] font-semibold mt-1">{b.message}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav active="bookings" items={OWNER_NAV} onNav={setPage} />
    </div>
  );

  // ─── OWNER DATA ───
  if (page === "owner-data") return (
    <div key={page} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className={styles.container + " page-enter"}>
      <header className={styles.header}>
        <span className={styles.headerTitle}>Slotly</span>
        <div className="w-8" />
      </header>
      <div className="pt-20 px-5 pb-28">
        <div className="text-2xl font-bold tracking-tight mb-5">Data & Insights</div>

        <div className="bg-[#1b1b1d] rounded-2xl p-5 mb-6 text-white">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#76777d] mb-3 flex items-center gap-1"><Icon name="auto_awesome" className="text-sm" />AI Forecast</div>
          {loadingForecast ? <div className="text-sm text-[#76777d]">Generating forecast...</div> : forecast ? (
            <div className="flex flex-col gap-4">
              <div><div className="text-[10px] font-bold uppercase tracking-widest text-[#76777d] mb-1">Summary</div><p className="text-sm leading-relaxed">{forecast.overall_summary}</p></div>
              <div><div className="text-[10px] font-bold uppercase tracking-widest text-[#76777d] mb-1">Peak Warning</div><p className="text-sm leading-relaxed">{forecast.peak_warning}</p></div>
              <div><div className="text-[10px] font-bold uppercase tracking-widest text-[#76777d] mb-1">Suggested Action</div><p className="text-sm leading-relaxed">{forecast.suggested_action}</p></div>
            </div>
          ) : <div className="text-sm text-[#76777d]">Could not load forecast</div>}
        </div>

        <div className="border border-[#c6c6cd] bg-white rounded-2xl p-5 mb-6">
          <div className={styles.label}>Weekly strategy</div>
          {loadingStrategy ? (
            <div className="text-sm text-[#76777d]">Generating recommendations...</div>
          ) : weeklyStrategy ? (
            <ul className="flex flex-col gap-3">
              {weeklyStrategy.recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#45464d]"><Icon name="check_circle" className="text-base text-[#22C55E] shrink-0 mt-0.5" />{r}</li>
              ))}
            </ul>
          ) : <div className="text-sm text-[#76777d]">Could not load recommendations</div>}
        </div>

        <div className="border border-[#c6c6cd] bg-white rounded-2xl p-5 mb-6">
          <div className={styles.labelTight + " mb-4"}>Revenue trend (past 7 days)</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={historicalData} margin={{ top: 8, left: 20, right: 20 }}>
              <XAxis dataKey="date" interval={0} tickFormatter={(d: string) => new Date(d).toLocaleDateString("en-SG", { day: "numeric", month: "short" })} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#76777d" }} />
              <YAxis hide />
              <Line type="monotone" dataKey="revenue" stroke="#1b1b1d" strokeWidth={2} dot={{ r: 3, fill: "#1b1b1d" }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="border border-[#c6c6cd] bg-white rounded-2xl p-5 overflow-x-auto">
          <div className={styles.labelTight + " mb-4"}>Past 7 days</div>
          <table className="w-full text-xs whitespace-nowrap">
            <thead>
              <tr className="text-left text-[#76777d] border-b border-[#e4e2e4]">
                <th className="pb-2 pr-3">Date</th>
                <th className="pb-2 pr-3">Bookings</th>
                <th className="pb-2 pr-3">Revenue</th>
                <th className="pb-2 pr-3">Off-peak</th>
                <th className="pb-2">Rating</th>
              </tr>
            </thead>
            <tbody>
              {historicalData.map(d => (
                <tr key={d.date} className="border-b border-[#e4e2e4] last:border-0">
                  <td className="py-2 pr-3 font-semibold">{new Date(d.date).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}</td>
                  <td className="py-2 pr-3">{d.total_bookings}</td>
                  <td className="py-2 pr-3">${d.revenue}</td>
                  <td className="py-2 pr-3">{d.offpeak_deals}</td>
                  <td className="py-2">{d.avg_rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <BottomNav active="data" items={OWNER_NAV} onNav={setPage} />
    </div>
  );

  // ─── OWNER ACCOUNT ───
  if (page === "owner-account") return (
    <div key={page} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className={styles.container + " page-enter"}>
      <header className={styles.header}>
        <span className={styles.headerTitle}>Slotly</span>
        <div className="w-8" />
      </header>
      <div className="pt-20 px-5 pb-28">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 rounded-full overflow-hidden border border-[#c6c6cd] mb-4"><img src={AVATAR_IMG} alt="" className="w-full h-full object-cover" /></div>
          <div className="text-2xl font-bold tracking-tight">{user?.name || "—"}</div>
          <div className="text-sm text-[#45464d] mt-1">{form.location || "—"}</div>
        </div>

        <div className="border border-[#c6c6cd] bg-white rounded-2xl p-5 mb-6 flex flex-col gap-4">
          <div className="flex justify-between items-baseline mb-1">
            <div className={styles.labelTight}>Business details</div>
            <button onClick={() => setEditingBusiness(v => !v)} className="flex items-center gap-1 text-xs font-semibold text-black">
              <Icon name={editingBusiness ? "check" : "edit"} className="text-sm" />{editingBusiness ? "Done" : "Edit"}
            </button>
          </div>

          <div>
            <div className={styles.labelTight + " mb-1"}>Business name</div>
            {editingBusiness ? (
              <input value={user?.name ?? ""} onChange={e => user && setUser({ ...user, name: e.target.value })} className={styles.input} />
            ) : <div className="text-sm font-medium">{user?.name || "—"}</div>}
          </div>

          <div className="border-t border-[#e4e2e4] pt-4">
            <div className={styles.labelTight + " mb-1"}>Location</div>
            {editingBusiness ? (
              <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className={styles.input} />
            ) : <div className="text-sm font-medium">{form.location || "—"}</div>}
          </div>

          <div className="border-t border-[#e4e2e4] pt-4">
            <div className={styles.labelTight + " mb-1"}>Main service</div>
            {editingBusiness ? (
              <input value={form.service} onChange={e => setForm({ ...form, service: e.target.value })} className={styles.input} />
            ) : <div className="text-sm font-medium">{form.service || "—"}</div>}
          </div>

          <div className="border-t border-[#e4e2e4] pt-4">
            <div className={styles.labelTight + " mb-1"}>Base price</div>
            {editingBusiness ? (
              <input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className={styles.input} placeholder="0.00" />
            ) : <div className="text-sm font-medium">{form.price ? `$${form.price}` : "—"}</div>}
          </div>

          <div className="border-t border-[#e4e2e4] pt-4">
            <div className={styles.labelTight + " mb-1"}>Off-peak discount</div>
            {editingBusiness ? (
              <>
                <div className="flex justify-between mb-1"><span className="text-sm text-[#45464d]">Discount level</span><span className="text-sm font-bold">{businessDiscount}%</span></div>
                <input type="range" min={0} max={100} value={businessDiscount} onChange={e => setBusinessDiscount(Number(e.target.value))} className="w-full accent-black" />
              </>
            ) : <div className="text-sm font-medium">{businessDiscount}%</div>}
          </div>

          <div className="border-t border-[#e4e2e4] pt-4">
            <div className={styles.labelTight + " mb-1"}>Off-peak time slot</div>
            {editingBusiness ? (
              <div className="flex gap-3">
                <div className="flex-1"><div className="text-xs text-[#45464d] mb-1">From</div><input type="time" value={offerStartTime} onChange={e => setOfferStartTime(e.target.value)} className={styles.input} /></div>
                <div className="flex-1"><div className="text-xs text-[#45464d] mb-1">To</div><input type="time" value={offerEndTime} onChange={e => setOfferEndTime(e.target.value)} className={styles.input} /></div>
              </div>
            ) : <div className="text-sm font-medium">{formatTimeOfDay(offerStartTime)} – {formatTimeOfDay(offerEndTime)}</div>}
          </div>
        </div>

        <button onClick={() => { setUser(null); setPage("splash"); }} className={styles.secondaryBtn}>Sign Out</button>
      </div>
      <BottomNav active="account" items={OWNER_NAV} onNav={setPage} />
    </div>
  );

  return null;
}
