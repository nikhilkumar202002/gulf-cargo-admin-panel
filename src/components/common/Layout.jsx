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
    <div className="content box-border w-full max-w-none flex-1 overflow-y-auto p-5">
      {!isDashboard && <Breadcrumb />}
      <Outlet />
    </div>
    <Footer />
  </div>
</div>

  );
});

export default Layout;
