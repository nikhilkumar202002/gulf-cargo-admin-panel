// src/pages/Profile/UserProfile.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearAuth } from "../../store/slices/authSlice";
import { logout as apiLogout } from "../../api/accountApi";

/* -------- utils -------- */
const resolveImageUrl = (src) => {
  if (!src) return "/avatar.png";
  if (/^https?:\/\//i.test(src)) return src;

  const fileBase =
    import.meta.env.VITE_FILE_BASE_URL ||
    (import.meta.env.VITE_API_BASE_URL
      ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, "")
      : "");

  return fileBase ? `${fileBase}${src.startsWith("/") ? "" : "/"}${src}` : src;
};

const Avatar = ({ src, alt = "Profile" }) => {
  const [img, setImg] = useState(resolveImageUrl(src));
  return (
    <img
      src={img}
      alt={alt}
      className="w-24 h-24 rounded-full mx-auto border-4 border-white shadow-md object-cover"
      onError={() => setImg("/avatar.png")}
    />
  );
};

/* -------- component -------- */
function UserProfile() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Read auth from Redux (single source of truth)
  const { token, user, status } = useSelector((s) => s.auth || {});

  // Kick to login if no token
  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
  }, [token, navigate]);

  const handleLogout = async () => {
    try {
      await apiLogout(); // ok if it fails; we still clear client state
    } catch (_) {}
    dispatch(clearAuth());
    navigate("/login", { replace: true });
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
      : user.branch?.name || "Not Assigned";
  const visaStatus =
    typeof user.visa === "string" ? user.visa : user.visa?.status || "N/A";
  const visaExpiry =
    typeof user.visa === "string" ? "N/A" : user.visa?.expiry || "N/A";
  const docNumber =
    typeof user.documents === "string"
      ? user.documents
      : user.documents?.document_number || "Not Uploaded";

  return (
    <section className="profile-page">
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
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Status</span>
                <span>{user.status || "—"}</span>
              </div>

              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Branch</span>
                <span>{branchName}</span>
              </div>

              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Visa Status</span>
                <span>{visaStatus}</span>
              </div>

              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Visa Expiry</span>
                <span>{visaExpiry}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium">Documents</span>
                <span>{docNumber}</span>
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t text-right">
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default UserProfile;
