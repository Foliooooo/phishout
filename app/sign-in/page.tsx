import type { Metadata } from "next";
import { AccountPage } from "@/components/account-page";

export const metadata: Metadata = { title: "Sign in · PHISH OUT" };

export default function Page({ searchParams }: PageProps<"/sign-in">) {
  return <AccountPage mode="sign-in" searchParams={searchParams} />;
}
