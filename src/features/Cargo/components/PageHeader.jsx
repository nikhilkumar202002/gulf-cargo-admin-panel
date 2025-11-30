import React from "react";
import { Link } from "react-router-dom";
import { BsFillBoxSeamFill } from "react-icons/bs";
import { useLocation } from "react-router-dom";

const breadcrumbNameMap = {
  "/cargo/create": "Add Cargo",
  "/cargo/allcargolist": "Cargos",
  "/dashboard": "Home",
};

export const PageHeader = ({ title }) => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  return (
    <div className="add-cargo-header flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
      <h2 className="header-cargo-heading flex items-center gap-2 text-lg font-semibold">
        <span className="header-cargo-icon text-xl">
          <BsFillBoxSeamFill />
        </span>
        {title}
      </h2>

      <nav aria-label="Breadcrumb" className="w-full sm:w-auto">
        <ol className="flex flex-wrap items-center gap-2 text-sm">
          <li>
            <Link
              to="/dashboard"
              className="text-gray-500 hover:text-gray-700 hover:underline"
            >
              Home
            </Link>
          </li>

          {pathnames.map((value, index) => {
            const to = `/${pathnames.slice(0, index + 1).join("/")}`;
            const isLast = index === pathnames.length - 1;
            const name = breadcrumbNameMap[to] || value;

            return (
              <React.Fragment key={to}>
                <li className="text-gray-400">/</li>
                {isLast ? (
                  <li aria-current="page" className="text-gray-800 font-medium">
                    {name}
                  </li>
                ) : (
                  <li>
                    <Link
                      to={to}
                      className="text-gray-500 hover:text-gray-700 hover:underline"
                    >
                      {name}
                    </Link>
                  </li>
                )}
              </React.Fragment>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};
