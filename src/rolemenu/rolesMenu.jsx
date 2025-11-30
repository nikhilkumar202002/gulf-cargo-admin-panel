
import {
  FaUsers,
  // FaTruck,
  FaBox,
  FaBuilding,
  FaUser,
  FaCog,
  // FaCcVisa
} from "react-icons/fa";
// import { IoDocumentAttachSharp } from "react-icons/io5";
import { RiMailSendFill } from "react-icons/ri";
import { BiSolidDashboard } from "react-icons/bi";
import { LiaFileInvoiceDollarSolid } from "react-icons/lia";

export const rolesMenu = {
  1: [ // Super Admin Menu
    { key: "dashboard", icon: <BiSolidDashboard />, label: "Dashboard", path: "/dashboard" },
    {
      key: "branch",
      icon: <FaBuilding />,
      label: "Branches",
      submenus: [
        { name: "All Branches", path: "/branches" },
        { name: "Add New Branch", path: "/branches/add" },
      ]
    },
    {
      key: "hr",
      icon: <FaUsers />,
      label: "HR & Staff",
      submenus: [
        { name: "All Staffs", path: "/hr&staff/allstaffs" },
        { name: "Create Staffs", path: "/hr&staff/createstaffs" },
      ]
    },
    {
      key: "cargos",
      icon: <FaBox />,
      label: "Cargo",
      submenus: [
        { name: "Shipment Report", path: "/shipment/shipmentreport" },
        { name: "All Cargos", path: "/cargo/allcargolist" },
        { name: "Create Cargo", path: "/cargoshipment/createcargo" },
        { name: "Create Shipment", path: "/shipment/createshipment" },
      ]
    },
      {
      key: "bills",
      icon: <LiaFileInvoiceDollarSolid />,
      label: "Bills",
      submenus: [
        { name: "All Bills", path: "/bills/view" },
        { name: "All Bill Shipments", path: "/bills-shipments/list" },
        { name: "Create Bills", path: "/bills/create" },
        { name: "Create Bill Shipment", path: "/bills-shipments/create" },  
      ]
    },
    {
      key: "sender",
      icon: <RiMailSendFill />,
      label: "Sender / Receiver",
      submenus: [
        { name: "View Customers", path: "/customers" },
        { name: "Create Customers", path: "/customers/create" },
      ]
    },
    // {
    //   key: "fleet",
    //   icon: <FaTruck />,
    //   label: "Fleet & Drivers",
    //   submenus: [
    //     { name: "Drivers", path: "/drivers/alldriverslist" },
    //     { name: "Add Drivers", path: "/drivers/addnewdriver" },
    //   ]
    // },
    // {
    //   key: "agency",
    //   icon: <FaUser />,
    //   label: "Agency & Partners",
    //   submenus: [
    //     { name: "Partner Agencies", path: "/partner-agencies" },
    //     { name: "Contracts & Agreements", path: "/contracts" },
    //     { name: "Agency Performance", path: "/performance" },
    //   ]
    // },
    // {
    //   key: "visa",
    //   icon: <FaCcVisa />,
    //   label: "Visa",
    //   submenus: [
    //     { name: "All Visa", path: "/visa/allvisa" },
    //     // { name: "Visa Employee", path: "/visaemployee" },
    //     { name: "Create Visa Type", path: "/visatype/create" },
    //   ]
    // },
    // {
    //   key: "document",
    //   icon: <IoDocumentAttachSharp />,
    //   label: "Document Type",
    //   submenus: [
    //     { name: "Create Document Type", path: "/documents/createdocument" },
    //     { name: "Document List", path: "/documents/documentlist" },
    //   ]
    // },
    // {
    //   key: "finance",
    //   icon: <FaMoneyBill />,
    //   label: "Finance & Accounts",
    //   submenus: [
    //     { name: "Invoices & Payments", path: "financeaccounts/invoicepayment" },
    //     { name: "Expenses & Purchase Orders", path: "financeaccounts/outstandingpayments" },
    //     { name: "Outstanding Payments", path: "financeaccounts/expensespurchaseorders" },
    //     { name: "Financial Reports", path: "financeaccounts/financialreports" },
    //   ]
    // },
    // {
    //   key: "reports",
    //   icon: <FaChartBar />,
    //   label: "Reports & Analytics",
    //   submenus: [
    //     { name: "Shipment Reports", path: "shipmentreport/shipmentreport" },
    //     { name: "Revenue & Expense Reports", path: "shipmentreport/revenueexpensereport" },
    //     { name: "Delivery Performance", path: "shipmentreport/deliveryperformance" },
    //     { name: "Branch-wise Analysis", path: "shipmentreport/branchanalysis" },
    //   ]
    // },
    {
      key: "settings",
      icon: <FaCog />,
      label: "System Settings",
      submenus: [
        // { name: "All Roles", path: "/roles/allroles" },
        // { name: "Create Role", path: "/roles/addroles" },
        { name: "Shipment Methods", path: "/shipmentmethod/view" },
        { name: "Visa", path: "/visa/allvisa" },
        { name: "Ports", path: "/port/view" },
        { name: "Shipment Status", path: "/shipmentstatus/view" },
        { name: "Licence types", path: "/licence/view" },
        { name: "Payment types", path: "/paymenttype/view" },
        { name: "Documents", path: "/documents/documentlist" },
        // { name: "Invoice Prefix", path: "/invoiceprevix/list" },
        { name: "Delivery Types", path: "/deliverytype/list" },
      ]
    }
  ],

  2: [ // Staff Menu
    { key: "dashboard", icon: <BiSolidDashboard />, label: "Dashboard", path: "/dashboard" },
    {
      key: "shipments",
      icon: <FaBox />,
      label: "Cargo",
      submenus: [
         { name: "All Cargos", path: "/cargo/allcargolist" },
        { name: "Create Cargo", path: "/cargoshipment/createcargo" },
      ]
    },
    {
      key: "sender",
      icon: <RiMailSendFill />,
      label: "Sender / Receiver",
      submenus: [
        { name: "View Customers", path: "/customers" },
        { name: "Create Customers", path: "/customers/create" },
      ]
    },
    // {
    //   key: "fleet",
    //   icon: <FaTruck />,
    //   label: "Fleet & Drivers",
    //   submenus: [
    //     { name: "Drivers", path: "/drivers/alldriverslist" },
    //     { name: "Add Drivers", path: "/drivers/addnewdriver" },
    //   ]
    // }
  ],

  3: [ // Agency Menu
    { key: "dashboard", icon: <BiSolidDashboard />, label: "Dashboard", path: "/dashboard" },
    {
      key: "shipments",
      icon: <FaBox />,
      label: "Shipments",
      submenus: [
        { name: "Create Shipment", path: "/cargoshipment/createcargo" },
        { name: "Shipment Report", path: "/shipment/shipmentreport" },
      ]
    },
    {
      key: "agency",
      icon: <FaUser />,
      label: "Agency & Partners",
      submenus: [
        { name: "Partner Agencies", path: "/partner-agencies" },
        { name: "Contracts & Agreements", path: "/contracts" },
        { name: "Agency Performance", path: "/performance" },
      ]
    }
  ]
};

export default rolesMenu;