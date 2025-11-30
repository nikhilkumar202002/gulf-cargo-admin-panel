import React, { useState, useEffect, useRef, useMemo } from "react";
import "./layout.css";
import { FiChevronDown, FiChevronUp, FiX } from "react-icons/fi";
import { NavLink, useLocation } from "react-router-dom";
import { rolesMenu } from "../rolemenu/rolesMenu";
import Logo from "../../src/assets/Logo.png";

const Sidebar = React.memo(function Sidebar({ userRole }) {
  const location = useLocation();

  // --- role → items ---
  const roleKey = useMemo(() => {
    if (userRole == null) return null;
    const m = String(userRole).toLowerCase().match(/\d+/);
    return m ? Number(m[0]) : null;
  }, [userRole]);
  const items = useMemo(() => Number.isFinite(roleKey) ? rolesMenu[roleKey] || [] : [], [roleKey]);

  // --- submenu toggles ---
  const [openMenu, setOpenMenu] = useState(null);
  const toggleMenu = (id) => setOpenMenu((p) => (p === id ? null : id));

  // Check if a submenu item is active
  const isSubmenuActive = (submenus) => {
    return submenus.some(sub => location.pathname === sub.path);
  };

  // Check if parent menu should be active
  const isMenuActive = (item) => {
    if (item.path && location.pathname === item.path) return true;
    if (item.submenus) return isSubmenuActive(item.submenus);
    return false;
  };

  // --- mobile open/close ---
  const [mobileOpen, setMobileOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    const onToggle = () => setMobileOpen((p) => !p);
    const onClose = () => setMobileOpen(false);
    const onEsc = (e) => e.key === "Escape" && setMobileOpen(false);

    window.addEventListener("toggle-sidebar", onToggle);
    window.addEventListener("close-sidebar", onClose);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("toggle-sidebar", onToggle);
      window.removeEventListener("close-sidebar", onClose);
      window.removeEventListener("keydown", onEsc);
    };
  }, []);

  // close when clicking outside (mobile only)
  useEffect(() => {
    const onDown = (e) => {
      if (!mobileOpen) return;
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [mobileOpen]);

  // lock scroll when open
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [mobileOpen]);

  const handleNavClick = () => {
    if (mobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Overlay (mobile only) */}
      <div
        className={`sidebar-overlay lg:hidden ${mobileOpen ? "open" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />

      {/* Sidebar panel */}
      <aside
        ref={panelRef}
        className={`sidebar ${mobileOpen ? "open" : ""}`}
        aria-hidden={false}
        aria-modal={mobileOpen ? "true" : undefined}
        role="dialog"
      >
        <div className="logo-section" style={{ display: "flex", alignItems: "center", padding: 16 }}>
          <img src={Logo} alt="Logo" style={{ height: 40, marginRight: 10 }} />
          {/* Close (mobile) */}
          <button
            type="button"
            className="sidebar-close lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            title="Close"
          >
            <FiX size={22} />
          </button>
        </div>

        <ul className="menu-list" style={{ padding: 0, margin: 0 }}>
          {items.map((item) => {
            const id = item.key || item.label;
            const hasSubs = Array.isArray(item.submenus) && item.submenus.length > 0;

            return (
              <li key={id} style={{ listStyle: "none" }}>
                {item.path && !hasSubs ? (
                  <NavLink
                    to={item.path}
                    onClick={handleNavClick}
                    className={({ isActive }) => `menu-header ${isActive ? "active" : ""}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "12px 20px",
                      textDecoration: "none",
                      color: "inherit",
                      fontWeight: 550,
                    }}
                  >
                    <span className="menu-icon" style={{ minWidth: 24 }}>{item.icon}</span>
                    <span style={{ flex: 1, fontSize: 14 }}>{item.label}</span>
                  </NavLink>
                ) : (
                  <button
                    type="button"
                    className={`menu-header ${isMenuActive(item) ? "active" : ""}`}
                    onClick={() => hasSubs && toggleMenu(id)}
                    aria-expanded={hasSubs ? openMenu === id : undefined}
                    aria-controls={hasSubs ? `submenu-${id}` : undefined}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: "transparent",
                      border: 0,
                      cursor: hasSubs ? "pointer" : "default",
                      display: "flex",
                      alignItems: "center",
                      padding: "12px 20px",
                      color: "inherit",
                      fontWeight: 550,
                    }}
                  >
                    <span className="menu-icon" style={{ minWidth: 24 }}>{item.icon}</span>
                    <span style={{ flex: 1, fontSize: 14 }}>{item.label}</span>
                    {hasSubs && (
                      <span style={{ marginLeft: "auto" }}>
                        {openMenu === id ? <FiChevronUp /> : <FiChevronDown />}
                      </span>
                    )}
                  </button>
                )}

                {hasSubs && (
                  <ul
                    id={`submenu-${id}`}
                    className="submenu"
                    style={{ padding: 0, margin: 0, display: openMenu === id ? "block" : "none" }}
                  >
                    {item.submenus.map((sub) => (
                      <li key={sub.path || sub.name} style={{ listStyle: "none" }}>
                        <NavLink
                          to={sub.path}
                          onClick={handleNavClick}
                          className={({ isActive }) => `submenu-item ${isActive ? "active" : ""}`}
                          style={{
                            display: "block",
                            padding: "8px 0 8px 48px",
                            textDecoration: "none",
                            color: "inherit",
                            fontSize: 14,
                          }}
                        >
                          {sub.name}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}

          {items.length === 0 && (
            <li style={{ listStyle: "none" }}>
              <div style={{ padding: 16, color: "#9CA3AF", fontSize: 12 }}>
                No menu configured for your role.
              </div>
            </li>
          )}
        </ul>
      </aside>
    </>
  );
});

export default Sidebar;
