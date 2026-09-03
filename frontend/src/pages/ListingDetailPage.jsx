import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import mapboxgl from "mapbox-gl";
import { MapPin, Star, ArrowLeft, MessageSquareText, Trash2, User as UserIcon, Loader2, Pencil, Check, X } from "lucide-react";
import { fmtRel, initials } from "@/lib/format";

export default function ListingDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, config } = useAuth();
  const [listing, setListing] = useState(null);
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [error, setError] = useState("");
  const mapContainer = useRef(null);
  const mapRef = useRef(null);

  const load = async () => {
    const { data } = await api.get(`/listings/${id}`);
    setListing(data.listing);
  };
  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!listing || !config.mapboxToken || !mapContainer.current || mapRef.current) return;
    mapboxgl.accessToken = config.mapboxToken;
    const [lng, lat] = listing.geometry?.coordinates || [0, 0];
    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [lng, lat],
      zoom: 10,
      attributionControl: false,
    });
    const el = document.createElement("div");
    el.className = "w-8 h-8 rounded-full bg-[#00A884] border-2 border-[#0B141A] shadow-lg";
    new mapboxgl.Marker(el).setLngLat([lng, lat]).addTo(mapRef.current);
  }, [listing, config.mapboxToken]);

  const submitReview = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/listings/${id}/reviews`, { rating, comment: reviewText });
      setReviewText(""); setRating(5);
      await load();
    } finally { setBusy(false); }
  };

  const deleteReview = async (rid) => {
    await api.delete(`/listings/${id}/reviews/${rid}`);
    load();
  };

  const deleteListing = async () => {
    if (!window.confirm("Delete this listing? This will cascade-remove its reviews & chats.")) return;
    await api.delete(`/listings/${id}`);
    nav("/listings");
  };

  const startEditing = () => {
    setEditForm({
      title: listing.title,
      description: listing.description,
      price: listing.price,
      location: listing.location,
      country: listing.country || "",
      category: listing.category || "Apartment",
    });
    setError("");
    setEditing(true);
  };

  const saveListing = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.put(`/listings/${id}`, editForm);
      setListing((current) => ({ ...current, ...data.listing, reviews: current.reviews }));
      setEditing(false);
    } catch (requestError) {
      setError(requestError?.response?.data?.error || requestError?.response?.data?.details?.join(", ") || "Could not update listing.");
    } finally {
      setBusy(false);
    }
  };

  const messageHost = async () => {
    const { data } = await api.post("/chats", {
      participantIds: [listing.owner._id || listing.owner.id],
      isGroup: false,
      listingId: listing._id,
    });
    nav("/chat");
  };

  if (!listing) return <div className="flex-1 grid place-items-center text-[#8696A0]"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  const owned = (listing.owner._id || listing.owner.id) === user.id;
  const avgRating = listing.reviews?.length
    ? (listing.reviews.reduce((a, r) => a + r.rating, 0) / listing.reviews.length).toFixed(1)
    : null;

  return (
    <div className="flex-1 overflow-y-auto wispr-doodle-bg">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-6 pt-6 pb-3 flex items-center justify-between">
        <Link to="/listings" data-testid="back-to-listings" className="text-sm text-[#8696A0] hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to marketplace
        </Link>
        {owned && (
          <div className="flex items-center gap-3">
            <button onClick={startEditing} data-testid="edit-listing-button" className="text-sm text-[#00A884] hover:text-[#25D366] flex items-center gap-1">
              <Pencil className="w-4 h-4" /> Edit listing
            </button>
            <button onClick={deleteListing} data-testid="delete-listing-button" className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1">
              <Trash2 className="w-4 h-4" /> Delete listing
            </button>
          </div>
        )}
      </div>

      {/* Gallery */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-4 gap-2 rounded-2xl overflow-hidden aspect-[16/8] bg-[#202C33]">
          {listing.images?.[0] && <img src={listing.images[0].url} alt="" className="col-span-2 row-span-2 w-full h-full object-cover" />}
          {listing.images?.slice(1, 5).map((im, i) => (
            <img key={i} src={im.url} alt="" className="w-full h-full object-cover" />
          ))}
          {(!listing.images || listing.images.length === 0) && (
            <div className="col-span-4 grid place-items-center text-[#54636B]">No photos</div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {editing ? (
            <form onSubmit={saveListing} className="bg-[#202C33] border border-[#00A884]/40 rounded-2xl p-5 space-y-4" data-testid="edit-listing-form">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold" style={{ fontFamily: "Outfit" }}>Edit listing</h2>
                <button type="button" onClick={() => setEditing(false)} data-testid="cancel-edit-listing-button" className="w-8 h-8 rounded-full hover:bg-[#2A3942] grid place-items-center"><X className="w-4 h-4" /></button>
              </div>
              <input data-testid="edit-listing-title-input" value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} className="w-full bg-[#0B141A] border border-[#222D34] focus:border-[#00A884] rounded-xl px-3 h-11 outline-none" required />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input data-testid="edit-listing-price-input" type="number" min="0" value={editForm.price} onChange={(event) => setEditForm({ ...editForm, price: event.target.value })} className="w-full bg-[#0B141A] border border-[#222D34] focus:border-[#00A884] rounded-xl px-3 h-11 outline-none" required />
                <input data-testid="edit-listing-category-input" value={editForm.category} onChange={(event) => setEditForm({ ...editForm, category: event.target.value })} className="w-full bg-[#0B141A] border border-[#222D34] focus:border-[#00A884] rounded-xl px-3 h-11 outline-none" />
              </div>
              <input data-testid="edit-listing-location-input" value={editForm.location} onChange={(event) => setEditForm({ ...editForm, location: event.target.value })} className="w-full bg-[#0B141A] border border-[#222D34] focus:border-[#00A884] rounded-xl px-3 h-11 outline-none" required />
              <textarea data-testid="edit-listing-description-input" rows={5} value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} className="w-full bg-[#0B141A] border border-[#222D34] focus:border-[#00A884] rounded-xl px-3 py-2 outline-none resize-y" required />
              {error && <p className="text-sm text-red-400" data-testid="edit-listing-error">{error}</p>}
              <div className="flex justify-end">
                <button type="submit" disabled={busy} data-testid="save-listing-button" className="h-10 px-4 rounded-xl bg-[#00A884] hover:bg-[#008F70] text-[#0B141A] font-semibold flex items-center gap-2 disabled:opacity-60">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save changes
                </button>
              </div>
            </form>
          ) : <div>
            <div className="text-xs uppercase tracking-widest text-[#00A884] mb-2">{listing.category}</div>
            <h1 className="text-4xl font-extrabold" style={{ fontFamily: "Outfit" }}>{listing.title}</h1>
            <div className="flex items-center gap-2 text-[#8696A0] mt-1 text-sm">
              <MapPin className="w-4 h-4" /> {listing.location}
              {avgRating && <><span>·</span><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> {avgRating} ({listing.reviews.length})</>}
            </div>
          </div>}
          {!editing && <p className="text-[#E9EDEF]/90 leading-relaxed whitespace-pre-wrap">{listing.description}</p>}

          {/* Reviews */}
          <div className="pt-4 border-t border-[#222D34]">
            <h3 className="text-xl font-bold mb-3" style={{ fontFamily: "Outfit" }}>Reviews</h3>
            <form onSubmit={submitReview} className="mb-4 bg-[#202C33] rounded-2xl p-4 border border-[#222D34]" data-testid="review-form">
              <div className="flex items-center gap-1 mb-2">
                {[1,2,3,4,5].map((n) => (
                  <button key={n} type="button" onClick={() => setRating(n)} data-testid={`review-star-${n}`} className="text-yellow-400">
                    <Star className={`w-5 h-5 ${n <= rating ? "fill-yellow-400" : ""}`} />
                  </button>
                ))}
              </div>
              <textarea
                data-testid="review-text-input"
                rows={2}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience…"
                className="w-full bg-[#0B141A] border border-[#222D34] focus:border-[#00A884] rounded-xl px-3 py-2 outline-none text-sm"
                required
              />
              <div className="flex justify-end mt-2">
                <button type="submit" data-testid="submit-review-button" disabled={busy} className="h-9 px-4 rounded-xl bg-[#00A884] hover:bg-[#008F70] font-semibold text-[#0B141A] flex items-center gap-2 disabled:opacity-60">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />} Post review
                </button>
              </div>
            </form>

            <div className="space-y-3">
              {(listing.reviews || []).length === 0 && <div className="text-sm text-[#8696A0]">No reviews yet — be the first!</div>}
              {(listing.reviews || []).map((r) => {
                const rid = r._id || r.id;
                const authorId = r.author?._id || r.author?.id;
                const isMine = authorId === user.id;
                return (
                  <div key={rid} data-testid="review-item" className="bg-[#202C33] rounded-2xl p-4 border border-[#222D34]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00A884] to-[#005C4B] grid place-items-center text-[#0B141A] font-bold text-xs">
                          {initials(r.author?.username)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold">@{r.author?.username}</div>
                          <div className="text-[10px] text-[#8696A0]">{fmtRel(r.createdAt)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[1,2,3,4,5].map((n) => (
                            <Star key={n} className={`w-3 h-3 ${n <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-[#54636B]"}`} />
                          ))}
                        </div>
                        {isMine && (
                          <button data-testid="delete-review-button" onClick={() => deleteReview(rid)} className="text-red-400 hover:text-red-300">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-[#E9EDEF]/90">{r.comment}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-[#202C33] rounded-2xl border border-[#222D34] p-5">
            <div className="text-3xl font-extrabold" style={{ fontFamily: "Outfit" }}>${listing.price}<span className="text-sm font-medium text-[#8696A0]"> /night</span></div>
            <div className="mt-3 flex items-center gap-2 text-sm text-[#8696A0]">
              <UserIcon className="w-4 h-4" /> Hosted by <span className="text-white font-semibold">@{listing.owner?.username}</span>
            </div>
            {!owned && (
              <button
                onClick={messageHost}
                data-testid="message-host-button"
                className="mt-4 w-full h-11 rounded-xl bg-[#00A884] hover:bg-[#008F70] font-semibold text-[#0B141A] flex items-center justify-center gap-2 transition-colors"
              >
                <MessageSquareText className="w-4 h-4" /> Message host
              </button>
            )}
          </div>

          <div className="bg-[#202C33] rounded-2xl border border-[#222D34] p-4">
            <div className="text-xs uppercase tracking-widest text-[#00A884] mb-2 flex items-center gap-2">
              <MapPin className="w-3 h-3" /> Where you'll be
            </div>
            {config.mapboxToken ? (
              <div ref={mapContainer} data-testid="listing-detail-map" className="w-full h-64 rounded-xl overflow-hidden" />
            ) : (
              <div className="h-64 rounded-xl border border-dashed border-[#222D34] p-4 grid place-items-center text-sm text-[#8696A0] text-center">
                Add MAPBOX_TOKEN to enable the map.
                <div className="text-xs mt-2">Coordinates: {listing.geometry?.coordinates?.map((n) => n.toFixed(3)).join(", ")}</div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
