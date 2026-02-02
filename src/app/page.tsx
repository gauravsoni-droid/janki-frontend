/**
 * Landing page - redirects to dashboard or login.
 */
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";

export default async function Home() {
  const session = await getServerSession(authOptions);
  
  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}

