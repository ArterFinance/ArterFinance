/** Primary navigation. App routes also get the tab strip in AppTabs. */
export const NAV = [
  { href: "/vaults", label: "Vaults" },
  { href: "/lend", label: "Lend" },
  { href: "/borrow", label: "Borrow" },
  { href: "/deploy", label: "Deploy" },
  { href: "/institutions", label: "Institutions" },
  { href: "/platforms", label: "Platforms" },
  { href: "/notes", label: "Notes" },
] as const;

export const APP_TABS = [
  { href: "/vaults", label: "Vaults" },
  { href: "/lend", label: "Lend" },
  { href: "/borrow", label: "Borrow" },
  { href: "/deploy", label: "Deploy" },
  { href: "/manage", label: "Manage" },
  { href: "/analytics", label: "Analytics" },
  { href: "/swap", label: "Buy $ARTER" },
  { href: "/chat", label: "Chat" },
] as const;
