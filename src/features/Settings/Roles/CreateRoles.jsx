import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import { createRole, getPermissions } from "../../services/coreService";

export default function CreateRoles() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [selectedPerms, setSelectedPerms] = useState(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPermissions().then(setPermissions).catch(() => toast.error("Failed to load permissions"));
  }, []);

  const togglePerm = (id) => {
    const next = new Set(selectedPerms);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedPerms(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createRole({ name, permissions: Array.from(selectedPerms) });
      toast.success("Role created!");
      setTimeout(() => navigate("/roles/allroles"), 1000);
    } catch (err) {
      toast.error("Failed to create role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Toaster />
      <h1 className="text-2xl font-bold mb-6">Create Role</h1>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded shadow">
        <div>
          <label className="block text-sm font-medium mb-1">Role Name</label>
          <input className="border w-full p-2 rounded" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-3">Permissions</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {permissions.map(p => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selectedPerms.has(p.id)} onChange={() => togglePerm(p.id)} />
                {p.name}
              </label>
            ))}
          </div>
        </div>
        <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-6 py-2 rounded">
          {loading ? "Saving..." : "Create Role"}
        </button>
      </form>
    </div>
  );
}