"use server";

import { redirect } from "next/navigation";
import { endSupportSession } from "@/lib/impersonation";

/** "Exit support session" in the banner shown while staff are logged in as a customer. */
export async function exitSupportSession() {
  redirect(await endSupportSession());
}
