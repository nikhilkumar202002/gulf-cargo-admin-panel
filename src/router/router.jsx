import React, { lazy } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import Layout from "../components/Layout";

/* ---------------- utils ---------------- */
const getRoleInfo = (user) => {
  if (!user) return { roleId: null, roleName: "" };

  const roleVal = user.role;
  
  // Check all possible locations for the ID
  let rawId = 
    user.role_id ?? 
    user.roleId ?? 
    (typeof roleVal === "object" ? roleVal?.id : roleVal);

  // Convert to number safely
  const roleId = rawId != null && !isNaN(Number(rawId)) ? Number(rawId) : null;

  const roleName =
    user.role_name ??
    user.roleName ??
    (typeof roleVal === "object" ? roleVal?.name : String(roleVal || ""));

  return { roleId, roleName };
};

/* ---------------- guards ---------------- */
const PrivateRoute = ({ children }) => {
  const { token, isInitialized } = useSelector((s) => s.auth || {});
  if (!isInitialized) return null;
  return token ? children : <Navigate to="/login" replace />;
};

const RoleRoute = ({ allow, children }) => {
  const { user } = useSelector((s) => s.auth || {});
  const { roleId } = getRoleInfo(user);
  // Allow access if role matches
  return roleId != null && allow.includes(roleId)
    ? children
    : <Navigate to="/dashboard" replace />;
};

/* ---------------- layout wrapper ---------------- */
const LayoutWithRole = () => {
  const { user } = useSelector((s) => s.auth || {});
  const { roleId } = getRoleInfo(user);
  return <Layout userRole={roleId} />;
};

/* ---------------- lazy pages ---------------- */
const Login = lazy(() => import("../features/Auth/Login")); // Updated path example
// const Register = lazy(() => import("../features/Auth/Register"));
const ForgotPassword = lazy(() => import("../pages/Login/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/Login/ResetPassword"));

const Dashboard = lazy(() => import("../features/Dashboard/Dashboard"));

const AllBranches = lazy(() => import("../features/Settings/Branch/AllBranches"));
const AddBranch = lazy(() => import("../features/Settings/Branch/AddBranch"));
const EditBranch = lazy(() => import("../features/Settings/Branch/EditBranch"));
const ViewBranch = lazy(() => import("../features/Settings/Branch/ViewBranch"));

const CreateParty = lazy(() => import("../features/CRM/CreateParty"));
const PartyList = lazy(() => import("../features/CRM/PartyList"));
const ViewParty = lazy(() => import("../features/CRM/ViewParty"));

const AllVisa = lazy(() => import("../features/Settings/Visa/VisaTypeList"));
const VisaEmployees = lazy(() => import("../pages/Visa/VisaEmployees"));
const VisaTypeCreate = lazy(() => import("../pages/Visa/VisaTypeCreate"));

const StaffList = lazy(() => import("../features/HR/StaffList"));
const StaffCreate = lazy(() => import("../features/HR/StaffCreate"));
const StaffView = lazy(() => import("../features/HR/StaffView"));
const EditStaff = lazy(() => import("../features/HR/StaffEdit"));

const AddDriver = lazy(() => import("../pages/Drivers/AddDriver"));
const ViewAllDriver = lazy(() => import("../pages/Drivers/ViewAllDriver"));

const CreateCargo = lazy(() => import("../features/Cargo/CreateCargo"));
const ShippingReport = lazy(() => import("../pages/CargoShipment/ShipmentReport"));
const ShipmentList = lazy(() => import("../pages/CargoShipment/ShipmentList"));
const CreateShipment = lazy(() => import("../pages/CargoShipment/CreateShipment"));
const CargoList = lazy(() => import("../features/Cargo/CargoList"));
const EditCargo = lazy(() => import("../pages/CargoShipment/EditCargo"));
const ViewCargo = lazy(() => import("../pages/CargoShipment/ViewCargo"));

const UserProfile = lazy(() => import("../pages/Profile/UserProfile"));

const AllRoles = lazy(() => import("../pages/Roles/AllRoles"));
const CreateRoles = lazy(() => import("../pages/Roles/CreateRoles"));

const DocumentTypeCreate = lazy(() => import("../pages/Document/CreateDocument"));
const DocumentList = lazy(() => import("../features/Settings/Document/DocumentList"));

const InvoicesPayments = lazy(() => import("../pages/FinanceAccounts/InvoicesPayments"));
const OutstandingPayments = lazy(() => import("../pages/FinanceAccounts/OutstandingPayments"));
const ExpensesPurchaseOrders = lazy(() => import("../pages/FinanceAccounts/ExpensesPurchaseOrders"));
const FinancialReports = lazy(() => import("../pages/FinanceAccounts/FinancialReports"));
const MonthlyReport = lazy(() => import("../pages/FinanceAccounts/MonthlyReport"));
const QuarterlyReport = lazy(() => import("../pages/FinanceAccounts/QuarterlyReport"));
const AnnualReport = lazy(() => import("../pages/FinanceAccounts/AnnualReport"));

/* Note: folder name has a space per your structure */
const ShipmentReport = lazy(() => import("../pages/Shipment Reports/ShipmentReport"));
const BranchAnalysis = lazy(() => import("../pages/Shipment Reports/BranchAnalysis"));
const DeliveryPerformance = lazy(() => import("../pages/Shipment Reports/DeliveryPerformance"));
const RevenueExpenseReport = lazy(() => import("../pages/Shipment Reports/RevenueExpenseReport"));

/* Note: folder name has spaces in your structure */
const ShipmentMethodCreate = lazy(() => import("../pages/Shipment Method/ShipmentMethodCreate"));
const ShipmentMethodView = lazy(() => import("../features/Settings/Shipment Method/ShipmentMethodView"));
const PortCreate = lazy(() => import("../pages/Ports/portCreate"));
const PortView = lazy(() => import("../features/Settings/Ports/PortView"));
const ShipmentStatusView = lazy(() => import("../features/Settings/Shipment Status/ShipmentStatusView"));
const LicenceCreate = lazy(() => import("../pages/Licence type/LicenceCreate"));
const LicenceView = lazy(() => import("../features/Settings/Licence type/LicenceView"));
const PaymentTypeList = lazy(() => import("../features/Settings/Payment Types/PaymentTypeList"));
const InvoiceView = lazy(() => import("../components/InvoiceView"));
const CustomerManifest = lazy(() => import("../pages/All Excels/CustomManifest"));
const DeliveryList = lazy(() => import("../pages/All Excels/DeliveryList"));
const LoadingList = lazy(() => import("../pages/All Excels/LoadingList"));
const PackingList = lazy(() => import("../pages/All Excels/PackingList"));
const ListInvoicePrefix = lazy(() => import("../pages/Invoice Number/ListInvoicePrefix"));
const ListDeliveryType = lazy(() => import("../features/Settings/Delivery Type/ListDeliveryType"));
const InvoiceOnly = lazy(() => import("../components/InvoiceOnly"));
const CreateBills = lazy(() => import("../features/Cargo/CreateBills"));
const BillsViews = lazy(() => import("../features/Cargo/BillsViews"));
const CreateShipmentBill = lazy(() => import("../features/Shipments/CreateShipmentBill"));
const ShipmentBillView = lazy(() => import("../features/Shipments/ShipmentBillView"));
const SingleBill = lazy(() => import("../features/Cargo/SingleBill"));
const BillEdit = lazy(() => import("../pages/Bills/BillEdit"));

const BillshipmentSingle = lazy(() => import("../features/Shipments/BillshipmentSingle"));
const EditShipment = lazy(() => import("../features/Shipments/EditBillShipment"));

/* ---------------- helpers ---------------- */
const AuthRedirect = () => {
  const { token, isInitialized } = useSelector((s) => s.auth || {});
  // Show loading or nothing until auth is initialized
  if (!isInitialized) return null;
  return token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

/* ---------------- routes ---------------- */
const router = createBrowserRouter([
  {
    path: "/",
    element: <AuthRedirect />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  // {
  //   path: "/register",
  //   element: <Register />,
  // },
  {
    path: "/forgotpassword",
    element: <ForgotPassword />,
  },
  {
    path: "/resetpassword",
    element: <ResetPassword />,
  },

  {
    element: (
      <PrivateRoute>
        <LayoutWithRole />
      </PrivateRoute>
    ),
    children: [
      { path: "dashboard", element: <Dashboard /> },

      { path: "branches", element: <AllBranches /> },
      { path: "branches/add", element: <AddBranch /> },
      { path: "branches/edit/:id", element: <EditBranch /> },
      { path: "branch/viewbranch/:id", element: <ViewBranch /> },

      { path: "customers", element: <PartyList /> },
      { path: "customers/create", element: <CreateParty /> },
      { path: "senderreceiver/senderview/:id", element: <ViewParty /> },

      { path: "visa/allvisa", element: <AllVisa /> },
      { path: "visaemployee", element: <VisaEmployees /> },
      { path: "visatype/create", element: <VisaTypeCreate /> },

      { path: "hr&staff/allstaffs", element: <StaffList /> },
      { path: "hr&staff/createstaffs", element: <StaffCreate /> },
      { path: "hr&staff/staff/:id", element: <StaffView /> },
      { path: "hr&staff/staff/:id/edit", element: <EditStaff/> },

      { path: "drivers/alldriverslist", element: <ViewAllDriver /> },
      { path: "drivers/addnewdriver", element: <AddDriver /> },

      { path: "cargoshipment/createcargo", element: <CreateCargo /> },
      { path: "shipment/createshipment", element: <CreateShipment /> },
      { path: "shipment/shipmentreport", element: <ShippingReport /> }, // from CargoShipment folder

      { path: "documents/documentlist", element: <DocumentList /> },
      { path: "documents/createdocument", element: <DocumentTypeCreate /> },

      { path: "financeaccounts/invoicepayment", element: <InvoicesPayments /> },
      { path: "financeaccounts/outstandingpayments", element: <OutstandingPayments /> },
      { path: "financeaccounts/expensespurchaseorders", element: <ExpensesPurchaseOrders /> },
      { path: "financeaccounts/financialreports", element: <FinancialReports /> },

      { path: "financeaccounts/monthlyreport", element: <MonthlyReport /> },
      { path: "financeaccounts/quarterlyreport", element: <QuarterlyReport /> },
      { path: "financeaccounts/annualreport", element: <AnnualReport /> },

      // “Shipment Reports” section (different folder)
      { path: "shipmentreport/shipmentreport", element: <ShipmentReport /> },
      { path: "shipmentreport/branchanalysis", element: <BranchAnalysis /> },
      { path: "shipmentreport/deliveryperformance", element: <DeliveryPerformance /> },
      { path: "shipmentreport/revenueexpensereport", element: <RevenueExpenseReport /> },

      { path: "shipmentmethod/create", element: <ShipmentMethodCreate /> },
      { path: "shipmentmethod/view", element: <ShipmentMethodView /> },

      { path: "port/create", element: <PortCreate /> },
      { path: "port/view", element: <PortView /> },

      { path: "shipmentstatus/view", element: <ShipmentStatusView /> },

      { path: "cargo/allcargolist", element: <CargoList /> },
      { path: "cargo/edit/:id", element: <EditCargo /> },
      { path: "cargo/view/:id", element: <ViewCargo /> },

      { path: "paymenttype/view", element: <PaymentTypeList /> },

      { path: "bills/create", element: <CreateBills/> },
      { path: "bills/view", element: <BillsViews/> },
      { path: "bills-shipments/create", element: <CreateShipmentBill/> },
      { path: "bills-shipments/list", element: <ShipmentBillView/> },

      { path: "licence/create", element: <LicenceCreate /> },
      { path: "licence/view", element: <LicenceView /> },
      { path: "shipments/:id/manifest", element: <CustomerManifest /> },
      { path: "shipments/:id/packinglist", element: <PackingList /> },
      { path: "shipments/:id/loadinglist", element: <LoadingList /> },
      { path: "shipments/:id/deliverylist", element: <DeliveryList /> },
      { path: "invoiceprevix/list", element: <ListInvoicePrefix /> },
      { path: "deliverytype/list", element: <ListDeliveryType /> },
      { path: "invoice/:id", element: <InvoiceOnly /> },
      { path: "bill/view/:id", element: <SingleBill /> },
      { path: "bill/edit/:id", element: <BillEdit  /> },

      { path: "billshipment/:id", element: <BillshipmentSingle /> },
      { path: "billshipment/:id/edit", element: <EditShipment /> },

      {
        path: "roles/allroles",
        element: (
          <RoleRoute allow={[1]}>
            <AllRoles />
          </RoleRoute>
        ),
      },
      {
        path: "roles/addroles",
        element: (
          <RoleRoute allow={[1]}>
            <CreateRoles />
          </RoleRoute>
        ),
      },

      { path: "profile", element: <UserProfile /> },
      { path: "shipments/shipmentsview/:id", element: <ShipmentList /> },
      { path: "shipments/shipmentsview/:id/invoice", element: <InvoiceView /> },
    ],
  },

  { path: "*", element: <Navigate to="/login" replace /> },
]);

export default router;
