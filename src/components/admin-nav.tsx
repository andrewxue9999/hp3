"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/humor-flavors", label: "Humor Flavors" },
  { href: "/admin/humor-flavor-steps", label: "Flavor Steps" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-8 space-y-2">
      {items.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            className={`block rounded-2xl border px-4 py-3 text-sm font-medium transition ${
              isActive
                ? "border-[color:var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_12px_30px_-22px_rgba(0,0,0,0.35)]"
                : "border-[color:var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)] hover:border-[color:var(--border-strong)] hover:bg-[var(--surface-strong)]"
            }`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
