import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, Plus, Search, DollarSign, Star, MessageSquareText, Image as ImageIcon, X, Loader2, Upload } from "lucide-react";
import mapboxgl from "mapbox-gl";
import { useRef } from "react";

export default function ListingsPage() {
  const { user, config } = useAuth();
  const [listings, setListings] = useState([]);
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/listings");
    setListings(data.listings);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = listings.filter((l) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return l.title.toLowerCase().includes(s) || l.location.toLowerCase().includes(s) || (l.category || "").toLowerCase().includes(s);
  });

  return (
    <div className="flex-1 flex flex-col wispr-doodle-bg overflow-hidden">
      {/* Header */}
      <div className="h-16 px-6 flex items-center justify-between bg-[#111B21] border-b border-[#222D34]">
        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: "Outfit" }}>Marketplace</h2>
          <p className="text-xs text-[#8696A0]">Places to stay, curated by the community</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-[#202C33] rounded-xl px-3 h-10 w-72 max-w-[42vw]">
            <Search className="w-4 h-4 text-[#8696A0]" />
            <input
              data-testid="listings-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search location, title, category"
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            data-testid="create-listing-button"
            className="h-10 px-4 rounded-xl bg-[#00A884] hover:bg-[#008F70] font-semibold text-[#0B141A] flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> New listing
          </button>
        </div>
      </div>

      {/* Grid + map */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="grid place-items-center h-40 text-[#8696A0]"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-[#8696A0] py-20">
              No listings yet. Create the first one!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((l) => <ListingCard key={l._id} l={l} />)}
            </div>
          )}
        </div>

        {/* Map panel */}
        <MapPanel listings={filtered} token={config.mapboxToken} />
      </div>

      {showCreate && <CreateListingModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function ListingCard({ l }) {
  const img = l.images?.[0]?.url;
  return (
    <Link
      to={`/listings/${l._id}`}
      data-testid="listing-card-item"
      className="group block rounded-2xl bg-[#202C33] border border-[#222D34] overflow-hidden hover:-translate-y-1 hover:border-[#00A884]/50 transition-all duration-300"
    >
      <div className="aspect-[4/3] bg-[#0B141A] relative overflow-hidden">
        {img ? (
          <img src={img} alt={l.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full grid place-items-center text-[#54636B]"><ImageIcon className="w-10 h-10" /></div>
        )}
        <div className="absolute top-3 left-3 bg-[#0B141A]/80 backdrop-blur px-2.5 py-1 rounded-full text-xs font-semibold text-[#00A884]">
          {l.category || "Stay"}
        </div>
        <div className="absolute bottom-3 right-3 bg-[#00A884] text-[#0B141A] font-bold px-3 py-1 rounded-full text-sm">
          ${l.price}
          <span className="text-[10px] font-medium opacity-70"> /night</span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg truncate" style={{ fontFamily: "Outfit" }}>{l.title}</h3>
        <div className="flex items-center gap-1 text-xs text-[#8696A0] mt-1">
          <MapPin className="w-3 h-3" /> {l.location}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-[#8696A0]">
          <div>by <span className="text-[#E9EDEF] font-medium">@{l.owner?.username}</span></div>
          <div className="flex items-center gap-1">{l.reviews?.length || 0} reviews</div>
        </div>
      </div>
    </Link>
  );
}

function MapPanel({ listings, token }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;
    if (token) mapboxgl.accessToken = token;

    if (!token) {
      // Skip mapbox init; will render fallback
      return;
    }
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [0, 20],
      zoom: 1.2,
      attributionControl: false,
    });
  }, [token]);

  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    const bounds = new mapboxgl.LngLatBounds();
    listings.forEach((l) => {
      const [lng, lat] = l.geometry?.coordinates || [0, 0];
      if (!lng && !lat) return;
      const el = document.createElement("div");
      el.className = "w-8 h-8 rounded-full bg-[#00A884] border-2 border-[#0B141A] shadow-lg cursor-pointer grid place-items-center text-[#0B141A] font-bold text-[10px]";
      el.textContent = `$${l.price}`;
      const popup = new mapboxgl.Popup({ offset: 18 }).setHTML(
        `<div style="color:#111"><strong>${l.title}</strong><br/><small>${l.location}</small></div>`
      );
      const m = new mapboxgl.Marker(el).setLngLat([lng, lat]).setPopup(popup).addTo(mapRef.current);
      markersRef.current.push(m);
      bounds.extend([lng, lat]);
    });
    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 8, duration: 800 });
    }
  }, [listings]);

  return (
    <div className="w-[420px] shrink-0 border-l border-[#222D34] bg-[#0B141A] p-4 hidden lg:block">
      <div className="text-xs uppercase tracking-widest text-[#00A884] mb-2 flex items-center gap-2">
        <MapPin className="w-3 h-3" /> Map view
      </div>
      {token ? (
        <div ref={containerRef} data-testid="listings-map" className="w-full h-[calc(100vh-120px)] rounded-xl overflow-hidden" />
      ) : (
        <div className="w-full h-[calc(100vh-120px)] rounded-xl border border-dashed border-[#222D34] p-6 grid place-items-center text-center text-sm text-[#8696A0]">
          <div>
            <MapPin className="w-8 h-8 mx-auto mb-3 text-[#00A884]" />
            Add a MAPBOX_TOKEN to your backend/.env to enable the live map.
          </div>
        </div>
      )}
    </div>
  );
}

function CreateListingModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "", description: "", price: "", location: "", country: "", category: "Apartment",
  });
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      files.forEach((f) => fd.append("images", f));
      await api.post("/listings", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onCreated();
    } catch (e) {
      setErr(e?.response?.data?.error || e?.response?.data?.details?.join(", ") || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 grid place-items-center" onClick={onClose} data-testid="create-listing-modal">
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-[#111B21] border border-[#222D34] rounded-2xl w-[560px] max-w-[92vw] max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222D34]">
          <div className="text-lg font-bold" style={{ fontFamily: "Outfit" }}>Create listing</div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#2A3942] grid place-items-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3">
          <Input label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required testId="listing-title-input" col2 />
          <Input label="Price / night" type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} required testId="listing-price-input" />
          <Input label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} testId="listing-category-input" />
          <Input label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} required testId="listing-location-input" col2 placeholder="e.g. Lisbon, Portugal" />
          <div className="col-span-2">
            <span className="text-xs uppercase tracking-widest text-[#8696A0] mb-2 inline-block">Description</span>
            <textarea
              data-testid="listing-description-input"
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              className="w-full bg-[#0B141A] border border-[#222D34] focus:border-[#00A884] rounded-xl px-3 py-2 outline-none text-sm"
              placeholder="Describe your listing"
            />
          </div>
          <div className="col-span-2">
            <span className="text-xs uppercase tracking-widest text-[#8696A0] mb-2 inline-block">Photos (up to 5)</span>
            <label className="flex items-center gap-3 cursor-pointer bg-[#0B141A] border border-dashed border-[#222D34] hover:border-[#00A884] rounded-xl px-4 py-6 text-sm text-[#8696A0] transition-colors" data-testid="listing-images-input-label">
              <Upload className="w-4 h-4" />
              <span>{files.length ? `${files.length} file(s) selected` : "Click to select images"}</span>
              <input
                type="file"
                data-testid="listing-images-input"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files).slice(0, 5))}
              />
            </label>
          </div>
        </div>
        {err && <div className="mx-5 mb-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">{err}</div>}
        <div className="p-5 pt-2 flex justify-end gap-2 border-t border-[#222D34]">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-xl hover:bg-[#2A3942] text-[#8696A0]">Cancel</button>
          <button
            type="submit"
            disabled={busy}
            data-testid="listing-submit-button"
            className="h-10 px-5 rounded-xl bg-[#00A884] hover:bg-[#008F70] font-semibold text-[#0B141A] flex items-center gap-2 disabled:opacity-60"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Publish
          </button>
        </div>
      </form>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required, testId, col2, placeholder }) {
  return (
    <label className={`block ${col2 ? "col-span-2" : ""}`}>
      <span className="text-xs uppercase tracking-widest text-[#8696A0] mb-2 inline-block">{label}</span>
      <input
        data-testid={testId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full bg-[#0B141A] border border-[#222D34] focus:border-[#00A884] rounded-xl px-3 h-10 outline-none text-sm"
      />
    </label>
  );
}
