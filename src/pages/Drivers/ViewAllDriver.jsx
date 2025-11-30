import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LiaUsersSolid } from "react-icons/lia";
import { FiSearch, FiPlus } from "react-icons/fi";
import { getAllDrivers } from "../../api/driverApi";

function ViewAllDriver() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  // skeleton loading added
  const [error, setError] = useState("");

  // Minimal filters like the screenshot
  const [searchTerm, setSearchTerm] = useState("");
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);

  // simple skeleton atom
  const Skel = ({ className = "", h = 40, w = "100%" }) => (
    <div
      className={`animate-pulse rounded-md bg-gray-200 ${className}`}
      style={{ height: h, width: w }}
    />
  );

  // --- helpers ---
  const normalizeDrivers = (res) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.drivers)) return res.drivers;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.data?.data)) return res.data.data;
    const firstArr = Object.values(res || {}).find(Array.isArray);
    return Array.isArray(firstArr) ? firstArr : [];
  };

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getAllDrivers();
      setDrivers(normalizeDrivers(res));
      setPage(1);
    } catch (err) {
      setError("Failed to load drivers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter((d) => {
      const name = (d.name || "").toLowerCase();
      const email = (d.email_address || "").toLowerCase();
      const phone = `${d.phone_code || ""} ${d.phone_number || ""}`.trim();
      const ltype = (d.license_type || "").toLowerCase();
      const lno = (d.license_number || "").toLowerCase();
      const branch = (d.branch_name || "").toLowerCase();
      const status = (d.status || "").toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(searchTerm) || // keep original for numbers/spaces
        ltype.includes(q) ||
        lno.includes(q) ||
        branch.includes(q) ||
        status.includes(q)
      );
    });
  }, [drivers, searchTerm]);

  // pagination like screenshot (just a "Rows" select)
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const StatusBadge = ({ value }) => {
    const active = String(value).toLowerCase() === "active" || Number(value) === 1;
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${
          active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"
        }`}
      >
        {active ? "Active" : "Inactive"}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#f7f7fb] p-4 md:p-6">
      {/* Top bar (search left, Rows + Add button right) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="relative w-full md:max-w-xl">
          {loading ? (
            <Skel h={44} />
          ) : (
            <>
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <FiSearch className="text-gray-400" />
              </span>
              <input
                type="text"
                placeholder="Search driver..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              />
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <>
              <Skel h={40} w={110} />
              <Skel h={44} w={180} />
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {[5, 10, 25, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <Link
                to="/drivers/addnewdriver"
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg shadow-sm"
              >
                <FiPlus className="text-lg" />
                Add New Driver
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Heading (icon + title) */}
        <div className="px-6 pt-5 pb-2">
          {loading ? (
            <Skel h={28} w={160} />
          ) : (
            <h2 className="flex items-center gap-3 text-lg font-semibold text-gray-900">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-indigo-50 text-indigo-700">
                <LiaUsersSolid className="text-xl" />
              </span>
              All Drivers
            </h2>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-y bg-white">
                {[
                  "#",
                  "Name",
                  "Phone",
                  "Email",
                  "License Type",
                  "License No.",
                  "Branch",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-left text-sm font-semibold text-gray-600"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <tr key={i} className="border-t">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-3.5 w-3/4 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
                    No drivers found.
                  </td>
                </tr>
              ) : (
                paged.map((d, idx) => (
                  <tr
                    key={d.id ?? idx}
                    className="border-t hover:bg-gray-50 transition-colors"
                  >
                    {/* # */}
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {(currentPage - 1) * pageSize + (idx + 1)}
                    </td>

                    {/* Name */}
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {d.name}
                    </td>

                    {/* Phone */}
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {d.phone_code && (
                        <span className="text-gray-500 mr-1">{d.phone_code}</span>
                      )}
                      {d.phone_number ? (
                        <a
                          href={`tel:${(d.phone_code || "")}${d.phone_number}`}
                          className="text-blue-700 hover:underline"
                        >
                          {d.phone_number}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {d.email_address ? (
                        <a
                          href={`mailto:${d.email_address}`}
                          className="text-blue-700 hover:underline"
                        >
                          {d.email_address}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>

                    {/* License Type */}
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {d.license_type || "-"}
                    </td>

                    {/* License No. */}
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {d.license_number || "-"}
                    </td>

                    {/* Branch */}
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {d.branch_name || "-"}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-sm">
                      <StatusBadge value={d.status} />
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"
                        title="Actions"
                      >
                        <span className="text-xl leading-none">⋮</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Simple footer */}
        {!loading && !error && (
          <div className="px-6 py-4 text-sm text-gray-600 border-t bg-white">
            Showing {paged.length} of {filtered.length} drivers
          </div>
        )}
      </div>
    </div>
  );
}

export default ViewAllDriver;
