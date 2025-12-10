// src/pages/Login/ForgotPassword.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// FIXED: Import from authService instead of accountApi
import { forgotPassword } from "../../services/authService";
import { MdWifiPassword } from "react-icons/md";
// Ensure this path is correct relative to your folder structure
// If this file is in src/pages/Login, and styles are in src/features/Auth, adjust accordingly.
// For now, assuming it's in the same folder or features/Auth:
import "../../features/Auth/LoginRegisterStyles.css"; 

function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const response = await forgotPassword(email);
      
      // show whatever the API returns or a default success message
      setMessage(response?.message || "OTP sent to your email.");
      
      if (response?.status || response?.success) {
        setIsOtpSent(true);

        // persist email for ResetPassword page
        localStorage.setItem("rp_email", email);

        // navigate to reset page
        navigate("/resetpassword", { state: { email } });
      }
    } catch (error) {
      setMessage(
        error?.response?.data?.message ||
        error?.message ||
        "Error sending OTP. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="forgot-password">
      <div className="forgot-password-form">
        <span className="forgot-password-form-icon"><MdWifiPassword /></span>
        <h2>Forgot Password</h2>

        <form onSubmit={handleForgotPassword}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
            disabled={isOtpSent} 
          />

          <button type="submit" disabled={isLoading || isOtpSent}>
            {isLoading ? "Sending OTP..." : "Send OTP"}
          </button>

          {/* Message sits directly below the button */}
          {message && (
            <p className="form-message" style={{ marginTop: 12, color: message.includes("Error") ? "red" : "green" }}>
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default ForgotPassword;