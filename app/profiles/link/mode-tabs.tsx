import Link from "next/link";
import { cn } from "@/lib/utils";

export function ModeTabs({ targetId, mode }: { targetId: string; mode: "internal" | "external" }) {
  const tabClass = (active: boolean) =>
    cn(
      "rounded-md px-3 py-1.5 text-sm font-medium",
      active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
      <Link
        href={`/profiles/link?for=${targetId}&mode=internal`}
        className={tabClass(mode === "internal")}
      >
        Internal
      </Link>
      <Link
        href={`/profiles/link?for=${targetId}&mode=external`}
        className={tabClass(mode === "external")}
      >
        External
      </Link>
    </div>
  );
}
