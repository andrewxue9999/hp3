"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/images", label: "Images" },
  { href: "/admin/humor-flavors", label: "Humor Flavors" },
  { href: "/admin/humor-flavor-steps", label: "Flavor Steps" },
  { href: "/admin/humor-mix", label: "Humor Mix" },
  { href: "/admin/terms", label: "Terms" },
  { href: "/admin/captions", label: "Captions" },
  { href: "/admin/caption-requests", label: "Caption Requests" },
  { href: "/admin/caption-examples", label: "Caption Examples" },
  { href: "/admin/llm-models", label: "LLM Models" },
  { href: "/admin/llm-providers", label: "LLM Providers" },
  { href: "/admin/llm-prompt-chains", label: "Prompt Chains" },
  { href: "/admin/llm-responses", label: "LLM Responses" },
  { href: "/admin/allowed-signup-domains", label: "Signup Domains" },
  { href: "/admin/whitelisted-emails", label: "Whitelisted Emails" },
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
                ? "border-cyan-200 bg-cyan-300/70 text-slate-950 shadow-[0_12px_30px_-22px_rgba(34,211,238,0.9)]"
                : "border-white/10 bg-white/5 text-slate-200 hover:border-cyan-200/30 hover:bg-white/10"
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
