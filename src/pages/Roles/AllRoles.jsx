import React, { useEffect, useState } from "react";
import { getAllRoles } from "../../api/rolesApi";  // Fetch roles from API

function AllRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch roles from API
  const fetchRoles = async () => {
    try {
      const items = await getAllRoles();  // returns a normalized array
      setRoles(Array.isArray(items) ? items : []);
      setError("");  // Reset error on success
    } catch (err) {
      
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      // optional: don't re-show skeleton on every poll
      if (roles.length === 0) setLoading(true);
      await fetchRoles();
    };

    run();
    const interval = setInterval(run, 5000);  // Re-fetch every 5 seconds
    return () => {
      cancelled = true;
      clearInterval(interval);  // Cleanup interval on component unmount
    };
  }, []);  // No dependency on `token` anymore

  return (
    <>
      <section className="all-roles p-6">
        <div className="all-roles-container max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">All Roles</h2>

          {loading ? (
            <p className="text-gray-600">Loading roles...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : roles.length === 0 ? (
            <p className="text-gray-600">No roles found.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg p-6 bg-white">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[#262262] text-sm border-b border-gray-200">
                    <th className="px-4 py-3">Sl. No</th>
                    <th className="px-4 py-3">Role Name</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role, index) => (
                    <tr
                      key={role.id ?? role.role_id ?? index}
                      className="hover:bg-gray-50 border-b border-gray-200 text-sm"
                    >
                      <td className="px-4 py-3">{index + 1}</td>
                      <td className="px-4 py-3">{role.role_name ?? role.name ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default AllRoles;
