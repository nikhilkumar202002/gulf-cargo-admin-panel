import React from "react";
import { Link, useLocation } from "react-router-dom";

// Define route names for breadcrumbs
const routeNames = {
  dashboard: "Dashboard",
  branches: "Branches",
  customers: "Customers",
  "hr&staff": "HR & Staff",
  drivers: "Drivers",
  cargoshipment: "Cargo Shipment",
  shipment: "Shipment",
  documents: "Documents",
  financeaccounts: "Finance Accounts",
  shipmentreport: "Shipment Reports",
  shipmentmethod: "Shipment Method",
  port: "Ports",
  shipmentstatus: "Shipment Status",
  cargo: "Cargo",
  paymenttype: "Payment Types",
  bills: "Bills",
  "bills-shipments": "Bills Shipments",
  licence: "Licence",
  shipments: "Shipments",
  invoiceprevix: "Invoice Prefix",
  deliverytype: "Delivery Type",
  roles: "Roles",
  profile: "Profile",
  visa: "Visa",
  // Add more as needed
};

const getBreadcrumbItems = (pathname) => {
  const segments = pathname.split("/").filter(Boolean);
  const items = [{ name: "Dashboard", path: "/dashboard" }];

  let currentPath = "";
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const name = routeNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    if (index < segments.length - 1 || /\d/.test(segment)) {
      // If not last segment or contains number (like ID), make it a link
      items.push({ name, path: currentPath });
    } else {
      items.push({ name });
    }
  });

  return items;
};

const Breadcrumb = React.memo(function Breadcrumb() {
  const location = useLocation();
  const items = getBreadcrumbItems(location.pathname);

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center space-x-2 text-sm text-gray-600">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && <span className="mx-2 text-gray-400">/</span>}
            {item.path ? (
              <Link to={item.path} className="text-blue-600 hover:text-blue-800 transition-colors">
                {item.name}
              </Link>
            ) : (
              <span className="text-gray-900 font-medium">{item.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
});

export default Breadcrumb;
