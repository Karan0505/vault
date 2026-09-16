"use client";

import dynamic from "next/dynamic";

const DynamicCartDrawer = dynamic(
  () => import("./CartDrawer").then((mod) => mod.CartDrawer),
  { ssr: false }
);

export function ClientCartDrawer() {
  return <DynamicCartDrawer />;
}
