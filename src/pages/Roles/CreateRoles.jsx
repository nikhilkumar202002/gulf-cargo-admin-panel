import React, { useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";

function CreateRoles() {

  const { token } = useSelector((s) => s.auth || {}); // ✅ Get token from Redux
  const [roleName, setRoleName] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

   const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const response = await axios.post(
        "https://api.gulfcargoksa.com/public/api/role",
        { role_name: roleName },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 201 || response.status === 200) {
        setSuccessMsg("Role created successfully");
        setRoleName("");
      } else {
        setErrorMsg("Failed to create role");
      }
    } catch (error) {
      
      setErrorMsg(error.response?.data?.message || "Something went wrong!");
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
        <section className="create-roles bg-gray-50  flex justify-center items-center">
      <div className="create-roles-container bg-white shadow-lg rounded-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Create Role
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role Name Input */}
          <div>
            <label
              htmlFor="roleName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Role Name
            </label>
            <input
              type="text"
              id="roleName"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="Enter role name"
              required
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-all duration-300 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Role"}
          </button>
        </form>

        {/* Success / Error Messages */}
        {successMsg && (
          <p className="mt-4 text-green-600 font-medium text-center">
            {successMsg}
          </p>
        )}
        {errorMsg && (
          <p className="mt-4 text-red-600 font-medium text-center">
            {errorMsg}
          </p>
        )}
      </div>
    </section>
    </>
  )
}

export default CreateRoles