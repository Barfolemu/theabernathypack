import Link from "next/link";
import { CalendarDays, Home, PawPrint, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const DESTINATIONS = [
  { href: "/events", label: "Feed", icon: Home },
  { href: "/events?view=calendar", label: "Calendar", icon: CalendarDays },
  { href: "/events/new", label: "Create", icon: Plus },
  { href: "/pack", label: "My Pack", icon: PawPrint },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-background lg:hidden">
      {DESTINATIONS.map(({ href, label, icon: Icon }) => (
        <Link
          key={label}
          href={href}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground",
            "hover:text-foreground",
          )}
        >
          <Icon className="size-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
