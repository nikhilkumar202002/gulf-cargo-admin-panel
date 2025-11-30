// src/pages/auth/ResetPassword.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { resetPassword } from "../../api/accountApi";
import "./LoginRegisterStyles.css";

function ResetPassword() {
  const navigate = useNavigate();
  const { state } = useLocation();

  // pull from route state first; fallback to localStorage
  const [email] = useState(state?.email || localStorage.getItem("rp_email") || "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // If no email, push user back to Forgot
  useEffect(() => {
    if (!email) {
      setMessage("Missing email. Please request an OTP again.");
      const t = setTimeout(() => navigate("/forgotpassword"), 1200);
      return () => clearTimeout(t);
    }
  }, [email, navigate]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setMessage("");

    try {
      const res = await resetPassword(email, otp, password);
      setMessage(res?.message || "Password reset successfully.");

      if (res?.success) {
        // cleanup and head to login
        localStorage.removeItem("rp_email");
        setTimeout(() => navigate("/login"), 1500);
      }
    } catch (err) {
      
      const apiMsg =
        err?.response?.data?.message ||
        Object.values(err?.response?.data?.errors || {})?.[0]?.[0] ||
        "Error resetting password. Please try again.";
      setMessage(apiMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="reset-password">

      <div className="reset-password-form">
         
        <h2>Forgot Password</h2>
      <form onSubmit={handleResetPassword}>

        <div className="reset-password-row">
          <label>OTP:</label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />
        </div>

        <div className="reset-password-row">
          <label>New Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="reset-password-row">
          <button type="submit" disabled={isLoading || !email}>
            {isLoading ? "Resetting..." : "Reset Password"}
          </button>
        </div>

        {message && <p className="form-message" style={{ marginTop: 12 }}>{message}</p>}
      </form>
      </div>
      
    </div>
  );
}

export default ResetPassword;
