import React from "react";

/* ---------- Small presentational skeletons ---------- */
const Skel = ({ w = "100%", h = 12, className = "" }) => (
  <div
    className={`animate-pulse rounded bg-slate-200/80 ${className}`}
    style={{ width: w, height: h }}
  />
);
const SkelField = () => <Skel h={40} />;
const SkelLine = ({ w = "60%", className = "" }) => (
  <Skel w={w} h={12} className={className} />
);

export const SkeletonCreateCargo = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <SkelLine w="30%" className="mb-2" />
        <SkelField />
      </div>
      <div>
        <SkelLine w="45%" className="mb-2" />
        <SkelField />
      </div>
      <div>
        <SkelLine w="45%" className="mb-2" />
        <SkelField />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[0, 1].map((i) => (
        <div key={i} className="space-y-3">
          <SkelLine w="30%" />
          <div>
            <SkelLine w="40%" className="mb-2" />
            <div className="flex gap-2">
              <div className="flex-1">
                <SkelField />
              </div>
              <div className="w-[46px]">
                <SkelField />
              </div>
            </div>
          </div>
          <div className="rounded-lg border p-3 space-y-2">
            <SkelLine w="90%" />
            <SkelLine w="40%" />
          </div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <SkelLine w="45%" className="mb-2" />
        <SkelField />
      </div>
      <div>
        <SkelLine w="45%" className="mb-2" />
        <SkelField />
      </div>
      <div>
        <SkelLine w="30%" className="mb-2" />
        <SkelField />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((k) => (
        <div key={k}>
          <SkelLine w="50%" className="mb-2" />
          <SkelField />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="md:col-span-3">
        <SkelLine w="30%" className="mb-2" />
        <SkelField />
      </div>
      <div className="space-y-2">
        <SkelLine w="100%" />
        <SkelLine w="80%" />
        <SkelLine w="90%" />
        <SkelLine w="70%" />
      </div>
    </div>
    <div className="border p-4 rounded-lg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
        <SkelLine w="35%" />
        <SkelLine w="20%" />
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-600">
              {["Slno", "Name", "Pieces", "Actions"].map((h) => (
                <th key={h} className="px-3 py-2">
                  <SkelLine w="60%" />
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>
    </div>
    <div className="flex items-center justify-between">
      <div className="w-40">
        <SkelField />
      </div>
    </div>
  </div>
);