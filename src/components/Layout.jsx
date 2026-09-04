import React, { Suspense } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";
// import Breadcrumb from "./Breadcrumb";
import "./layout.css";
import "@fontsource/roboto";
import { Outlet } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary";
import { KeyboardShortcutsProvider } from "../hooks/useKeyboardShortcuts";

const RouteLoading = () => (
  <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8" aria-busy="true">
    <div className="w-full max-w-xl space-y-4" aria-hidden="true">
      <div className="h-8 w-1/3 animate-pulse rounded-lg bg-slate-200" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}
      </div>
      <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
    </div>
    <span className="mt-5 text-sm font-medium text-slate-500">Loading page...</span>
  </div>
);

const Layout = React.memo(function Layout({ userRole, authResolving = false }) {
  return (
   <KeyboardShortcutsProvider>
   <div className="app flex h-screen w-full overflow-hidden">
  <Sidebar userRole={userRole} />

  <div className="main flex flex-col flex-1 min-w-0 overflow-hidden">
    <Header />
    <main className="content box-border w-full max-w-none flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-5">
      <ErrorBoundary variant="content">
        <Suspense fallback={<RouteLoading />}>
          {authResolving ? <RouteLoading /> : <Outlet />}
        </Suspense>
      </ErrorBoundary>
    </main>
    <Footer />
  </div>
</div>
   </KeyboardShortcutsProvider>

  );
});

export default Layout;
