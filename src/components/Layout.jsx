import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";
// import Breadcrumb from "./Breadcrumb";
import "./layout.css";
import "@fontsource/roboto";
import { Outlet } from "react-router-dom";

const Layout = React.memo(function Layout({ userRole }) {
  return (
   <div className="app flex h-screen w-full overflow-hidden">
  <Sidebar userRole={userRole} />

  <div className="main flex flex-col flex-1 min-w-0 overflow-hidden">
    <Header />
    <main className="content box-border w-full max-w-none flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-5">
      <Outlet />
    </main>
    <Footer />
  </div>
</div>

  );
});

export default Layout;
