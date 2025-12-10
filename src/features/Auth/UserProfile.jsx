// src/pages/Profile/UserProfile.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
// FIXED: Import the centralized logout thunk
import { logoutUser } from "../../store/slices/authSlice";

/* -------- utils -------- */
const resolveImageUrl = (src) => {
  if (!src) return "/avatar.png";
  if (/^https?:\/\//i.test(src)) return src;

  // Use env var or fallback. 
  // Make sure VITE_FILE_BASE_URL is set in your .env if needed (e.g. https://api.gulfcargoksa.com/storage)
  const fileBase = import.meta.env.VITE_FILE_BASE_URL || "";

  return fileBase ? `${fileBase}${src.startsWith("/") ? "" : "/"}${src}` : src;
};

const Avatar = ({ src, alt = "Profile" }) => {
  const [img, setImg] = useState(resolveImageUrl(src));

  // Update image if the source prop changes (e.g. after profile load)
  useEffect(() => {
    setImg(resolveImageUrl(src));
  }, [src]);

  return (
    <img
      src={img}
      alt={alt}
      className="w-24 h-24 rounded-full mx-auto border-4 border-white shadow-md object-cover bg-white"
      onError={(e) => {
        e.target.onerror = null; // prevent infinite loop
        setImg("/avatar.png");
      }}
    />
  );
};

/* -------- component -------- */
function UserProfile() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Read auth from Redux (single source of truth)
  const { token, user } = useSelector((s) => s.auth || {});

  // Kick to login if no token
  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [token, navigate]);

  const handleLogout = () => {
    // FIXED: Use redux action to ensure session/cache clearing works
    dispatch(logoutUser())
      .unwrap()
      .then(() => navigate("/login", { replace: true }))
      .catch(() => navigate("/login", { replace: true }));
  };

  if (!token) return null;
  
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading user profile…
      </div>
    );
  }

  // Defensive reads (API may send strings or objects)
  const roleName =
    typeof user.role === "string" ? user.role : user.role?.name || "—";
    
  const branchName =
    typeof user.branch === "string"
      ? user.branch
      : user.branch?.name || user.branch_name || "Not Assigned";
      
  const visaStatus =
    typeof user.visa === "string" ? user.visa : user.visa?.status || "N/A";
    
  const visaExpiry =
    typeof user.visa === "string" ? "N/A" : user.visa?.expiry || "N/A";
    
  const docNumber =
    typeof user.documents === "string"
      ? user.documents
      : user.documents?.document_number || "Not Uploaded";

  return (
    <section className="profile-page bg-gray-50">
      <div className="profile-page-container">
        <div className="flex justify-center items-center min-h-screen p-6">
          <div className="bg-white shadow-lg rounded-2xl w-full max-w-md overflow-hidden">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-[#ED2624] to-[#f5524f] p-6 text-white text-center">
              <Avatar src={user.profile_pic} alt={user.name || "Profile"} />
              <h2 className="mt-4 text-xl font-semibold">{user.name}</h2>
              <p className="text-sm opacity-90">{user.email}</p>
              <p className="mt-1 text-xs bg-white/20 px-3 py-1 rounded-full inline-block">
                {roleName}
              </p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-gray-700">
              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="font-medium text-gray-600">Status</span>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    String(user.status) === '1' || String(user.status).toLowerCase() === 'active' 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                    {user.status || "—"}
                </span>
              </div>

              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="font-medium text-gray-600">Branch</span>
                <span className="font-medium text-gray-900">{branchName}</span>
              </div>

              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="font-medium text-gray-600">Visa Status</span>
                <span className="text-gray-800">{visaStatus}</span>
              </div>

              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="font-medium text-gray-600">Visa Expiry</span>
                <span className="text-gray-800">{visaExpiry}</span>
              </div>

              <div className="flex justify-between border-b border-gray-100 pb-3">
                <span className="font-medium text-gray-600">Documents</span>
                <span className="text-gray-800">{docNumber}</span>
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 text-right">
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm font-medium text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default UserProfile;