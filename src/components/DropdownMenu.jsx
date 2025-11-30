
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { FaEye, FaEdit, FaTrash } from "react-icons/fa";
import React, { useEffect, useRef } from "react";

export default function DropdownMenu({ branch, position, onClose, handleDelete, deletingId = null }) {
    const menuRef = useRef(null);

     useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose(); // close menu
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  return createPortal(
    <div
    ref={menuRef}
      style={{
        position: "absolute",
        top: position.top,
        left: position.left,
      }}
      className="mt-2 w-32 bg-white border rounded shadow-lg z-50"
    >
      {/* View */}
      <Link
        to={`/branch/viewbranch/${branch.id}`}
        className="flex items-center gap-2 px-4 py-2 hover:bg-green-100 text-green-600"
        onClick={onClose}
      >
        <FaEye /> View
      </Link>

      {/* Edit */}
      <Link
        to={`/branches/edit/${branch.id}`}
        state={branch}
        className="flex items-center gap-2 px-4 py-2 hover:bg-yellow-100 text-yellow-600"
        onClick={onClose}
      >
        <FaEdit /> Edit
      </Link>

      {/* Delete */}
      <button
        onClick={() => {
          handleDelete(branch);
          onClose();
        }}
        className="flex items-center gap-2 px-4 py-2 hover:bg-red-100 text-red-600 w-full"
        disabled={deletingId === branch.id}
      >
        <FaTrash /> Delete
      </button>
    </div>,
    document.body // 👈 this ensures it’s rendered outside the table
  );
}
