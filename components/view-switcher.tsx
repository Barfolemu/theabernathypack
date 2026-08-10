import Link from "next/link";
import { cn } from "@/lib/utils";

type ViewSwitcherProps = {
  view: "list" | "calendar";
  basePath: string;
  preserveParams?: Record<string, string>;
};

function hrefFor(basePath: string, preserveParams: Record<string, string>, view: "list" | "calendar") {
  const params = new URLSearchParams(preserveParams);
  params.set("view", view);
  return `${basePath}?${params.toString()}`;
}

export function ViewSwitcher({ view, basePath, preserveParams = {} }: ViewSwitcherProps) {
  const tabClass = (active: boolean) =>
    cn(
      "rounded-md px-3 py-1.5 text-sm font-medium",
      active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
      <Link href={hrefFor(basePath, preserveParams, "list")} className={tabClass(view === "list")}>
        Upcoming List
      </Link>
      <Link
        href={hrefFor(basePath, preserveParams, "calendar")}
        className={tabClass(view === "calendar")}
      >
        Calendar Grid
      </Link>
    </div>
  );
}
