import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";
import Breadcrumb from "./Breadcrumb";
import "./layout.css";
import "@fontsource/roboto";
import { Outlet, useLocation } from "react-router-dom";

const Layout = React.memo(function Layout({ userRole }) {
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard";

  return (
   <div className="app flex h-screen w-screen overflow-hidden">
  <Sidebar userRole={userRole} />

  <div className="main flex flex-col flex-1 min-w-0 overflow-hidden">
    <Header />
    <div className="content flex-1 overflow-y-auto bg-gray-50 p-6">
      {!isDashboard && <Breadcrumb />}
      <div className="page-container bg-white rounded-lg shadow-sm p-6 min-h-full">
        <Outlet />
      </div>
    </div>
    <Footer />
  </div>
</div>

  );
});

export default Layout;
