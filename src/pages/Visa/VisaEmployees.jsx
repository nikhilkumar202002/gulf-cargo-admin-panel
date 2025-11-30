import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { FaHospitalUser } from "react-icons/fa";
import "../styles.css";

const VisaEmployees = () => {

  const { id } = useParams();
  const navigate = useNavigate();

  const employeesByVisa = {
    1: ["John Doe", "Jane Smith", "Ali Khan"],
    2: ["Emily Brown", "Chris Lee"],
    3: ["Michael Scott", "Dwight Schrute", "Jim Halpert"],
  };

  const employees = employeesByVisa[id] || [];

  return (
    <>
      <div className=" bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
         <h2 className="flex items-center gap-3 staff-panel-heading">
            <span className="staff-panel-heading-icon">
              <FaHospitalUser />
            </span>
            Employees under Visa ID {id}
          </h2>

      </div>

      {/* Employee List */}
      {employees.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {employees.map((emp, index) => (
            <div
              key={index}
              className="bg-white rounded-lg p-4 flex items-center justify-between hover:shadow-lg transition-all duration-200"
            >
              <div>
                <p className="text-gray-900 font-medium">{emp}</p>
                <span className="text-sm text-gray-500">Employee #{index + 1}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center bg-white  rounded-lg p-10">
          <img
            src="https://cdn-icons-png.flaticon.com/512/4076/4076505.png"
            alt="No Employees"
            className="w-28 mb-4 opacity-80"
          />
          <p className="text-gray-700 font-semibold text-lg mb-1">
            No employees found
          </p>
          <p className="text-gray-500 text-sm">
            There are no employees under this visa yet.
          </p>
        </div>
      )}
    </div>
    </>
  );
};

export default VisaEmployees;
