"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window`, so it only loads in the browser.
const Map = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="h-[220px] w-full animate-pulse rounded-xl bg-wash" />,
});

export default Map;
export type { MapPoint } from "./MapView";
