import { PageLoader } from "@/components/ascii-canvas";

export default function Loading() {
  return (
    <main className="flex w-full flex-1 items-start px-3 py-8 sm:px-4">
      <PageLoader />
    </main>
  );
}
