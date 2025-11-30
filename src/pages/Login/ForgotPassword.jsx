// src/pages/auth/ForgotPassword.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../../api/accountApi";
import { MdWifiPassword } from "react-icons/md";
import "./LoginRegisterStyles.css";

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
      // show whatever the API returns
      setMessage(response?.message || "OTP sent to your email.");
      if (response?.success) {
        setIsOtpSent(true);

        // persist email for ResetPassword page
        localStorage.setItem("rp_email", email);

        // also pass via route state (belt & suspenders)
        navigate("/resetpassword", { state: { email } });
      }
    } catch (error) {
     
      setMessage(
        error?.response?.data?.message ||
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
            onChange={(e)=>setEmail(e.target.value)}
            required
            placeholder="Enter your email"
            disabled={isOtpSent} // optional lock after success
          />

          <button type="submit" disabled={isLoading || isOtpSent}>
            {isLoading ? "Sending OTP..." : "Send OTP"}
          </button>

          {/* Message sits directly below the button */}
          {message && (
            <p className="form-message" style={{ marginTop: 12 }}>
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default ForgotPassword;
