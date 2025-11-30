import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus } from "react-icons/fi";
import { FaCcVisa } from "react-icons/fa";
import { getVisaTypes } from "../../api/visaType"; // <-- use API helper
import "../styles.css";

const VisaTypeList = () => {
  const navigate = useNavigate();

  const [visaTypes, setVisaTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  const fetchVisaTypes = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await getVisaTypes(); // returns response.data from axiosInstance

      // Normalize shape: support either array payload or { success, data }
      const list = Array.isArray(res) ? res : res?.data ?? [];
      setVisaTypes(list);
    } catch (err) {
      
      const status = err?.response?.status;
      if (status === 401) {
        setError("Unauthorized (401). Please sign in and try again.");
      } else {
        setError("Something went wrong. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisaTypes();
  }, []);

  // Close dropdown on outside click (kept, in case you wire menu later)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderStatusBadge = (raw) => {
    // Accept "Active"/"Inactive", 1/0, true/false, or strings "1"/"0"
    const isActive = (() => {
      if (typeof raw === "boolean") return raw;
      if (typeof raw === "number") return raw === 1;
      if (typeof raw === "string") {
        const s = raw.toLowerCase();
        if (s === "active" || s === "enabled" || s === "true" || s === "1") return true;
        if (s === "inactive" || s === "disabled" || s === "false" || s === "0") return false;
      }
      return false;
    })();

    return (
      <span
        className={`px-3 py-1 text-sm rounded-full ${
          isActive ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
        }`}
      >
        {isActive ? "Active" : "Inactive"}
      </span>
    );
  };

  return (
    <>
      <div className="bg-gray-50 min-h-screen max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-5 ">
          <h2 className="flex items-center gap-3 staff-panel-heading">
            <span className="staff-panel-heading-icon">
              <FaCcVisa />
            </span>
            All Visas
          </h2>
          <button
            onClick={() => navigate("/visatype/create")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-all duration-200"
          >
            <FiPlus className="text-lg" />
            Add New
          </button>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded-md mb-4">
            {error}
          </div>
        )}

        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          {loading ? (
            <p className="text-center py-6 text-gray-500">Loading visa types...</p>
          ) : visaTypes.length === 0 ? (
            <p className="text-center py-6 text-gray-500">No visa types found.</p>
          ) : (
            <table className="w-full text-sm text-gray-700">
              <thead className="visa-table-heading border-b">
                <tr>
                  <th className="py-6 px-6 text-left">Name</th>
                  <th className="py-6 px-6 text-left">Status</th>
                  <th className="py-6 px-6 text-center">Employees</th>
                  <th className="py-6 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visaTypes.map((visa) => (
                  <tr
                    key={visa.id ?? visa.type_name}
                    className="hover:bg-gray-50 border-b border-gray-200 last:border-none"
                  >
                    {/* Visa Name */}
                    <td className="px-6 py-4">
                      {visa.type_name ?? visa.name ?? `Visa #${visa.id ?? ""}`}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">{renderStatusBadge(visa.status)}</td>

                    {/* Employees Count (placeholder) */}
                    <td className="px-6 py-4 text-center">0</td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-center text-gray-500 cursor-pointer" ref={menuRef}>
                      ⋮
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
};

export default VisaTypeList;
