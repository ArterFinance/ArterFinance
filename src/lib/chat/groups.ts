// Groups of the $ARTER chat. Shared by the server (which enforces them)
// and the page (which lists them). Add a group here and it appears everywhere.

export type ChatGroup = {
  id: string;
  name: string;
  about: string;
  /** Only wallets holding the token can read or post. Checked on the server. */
  holdersOnly?: boolean;
};

export const GROUPS: ChatGroup[] = [
  { id: "lobby", name: "Lobby", about: "General talk for anyone with a wallet." },
  { id: "yield", name: "Vaults & yield", about: "Targets, strategies and what each vault should do." },
  { id: "credit", name: "Borrowing & risk", about: "LTVs, health factors, oracles and liquidations." },
  { id: "holders", name: "Holders' desk", about: "Only wallets holding the token get in.", holdersOnly: true },
];

export const findGroup = (id: unknown) => GROUPS.find((g) => g.id === id) ?? null;

export const MAX_LENGTH = 280;
