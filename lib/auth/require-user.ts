import { redirect } from "next/navigation";
import { getServerUser } from "./get-server-user";

export async function requireUser() {
  const user = await getServerUser();

  if (!user) redirect("/login");

  return user;
}