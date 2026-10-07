// src/app/page.tsx
import { redirect } from "next/navigation";
import { HomeScreen } from "@/app-components/HomeScreen";
import { homeFor } from "@/lib/roles";
import { verifySession } from "@/server/auth";

export default async function Home() {
  const user = await verifySession();
  if (user) redirect(homeFor(user.role));
  return <HomeScreen />;
}
