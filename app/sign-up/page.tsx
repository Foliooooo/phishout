import type { Metadata } from "next";
import { AccountPage } from "@/components/account-page";

export const metadata: Metadata = { title: "Sign up · PHISH OUT" };

export default function Page({ searchParams }: PageProps<"/sign-up">) {
  return <AccountPage mode="sign-up" searchParams={searchParams} />;
}
