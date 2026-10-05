"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Hash, Lock, LogOut, Send } from "lucide-react";
import { BRAND, CHAIN, explorerAddress, shortAddress } from "@/config/brand";
import { CopyCaTag } from "@/components/CopyCa";
import { Mark } from "@/components/Mark";
import { NavWallet, useWalletModal } from "@/components/wallet/WalletButton";
import { useWallet } from "@/components/wallet/WalletProvider";
import { GROUPS, MAX_LENGTH, type ChatGroup } from "@/lib/chat/groups";

type ChatMessage = { id: number; address: string; holder: boolean; text: string; at: number };
type Session = { address: string; holder: boolean };
type Summary = { id: string; locked: boolean; last: ChatMessage | null };
type Status = "idle" | "checking" | "signed_out" | "signing" | "ready" | "not_configured" | "offline";

const TITLE = `${BRAND.short} chat`;
const POLL_MS = 3000;
const LIST_POLL_MS = 6000;
const READ_KEY = "arter.chat.read";

async function api<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: T }> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, body };
}

/** A stable colour per address, so the same wallet always looks the same. */
const hue = (address: string) => Number.parseInt(address.slice(2, 8), 16) % 360;
const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function readMarks(): Record<string, number> {
  try {
    return JSON.parse(window.localStorage.getItem(READ_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}
function writeMarks(marks: Record<string, number>) {
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify(marks));
  } catch {
    // Unread dots simply reset next visit.
  }
}

/**
 * The $ARTER group chat. Every group is wallet-only: connect, sign one
 * free message, and the server opens a session for that address. The
 * holders' group is checked against the on-chain balance on every request.
 */
export function ChatApp() {
  const { address, signMessage } = useWallet();
  const { open: openWallet } = useWalletModal();
  const [status, setStatus] = useState<Status>("idle");
  const [session, setSession] = useState<Session | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [groupId, setGroupId] = useState(GROUPS[0].id);
  const [showRoom, setShowRoom] = useState(false); // phones: list or room
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marks, setMarks] = useState<Record<string, number>>({});
  const list = useRef<HTMLDivElement>(null);
  const lastId = useRef(0);

  const me = address?.toLowerCase() ?? null;
  const signedIn = session !== null && session.address === me;
  const group = GROUPS.find((g) => g.id === groupId) ?? GROUPS[0];
  const locked = summaries.find((s) => s.id === group.id)?.locked ?? false;

  useEffect(() => {
    // Read marks live in this browser only; loaded after mount to keep SSR stable.
    const t = window.setTimeout(() => setMarks(readMarks()), 0);
    return () => window.clearTimeout(t);
  }, []);

  // Existing session for this account?
  useEffect(() => {
    if (!me) return;
    let cancelled = false;
    api<Session>("/api/chat/session")
      .then(({ ok, status: code, body }) => {
        if (cancelled) return;
        if (code === 503) return setStatus("not_configured");
        if (ok && body.address === me) {
          setSession(body);
          setStatus("ready");
        } else {
          setSession(null);
          setStatus("signed_out");
        }
      })
      .catch(() => !cancelled && setStatus("offline"));
    return () => {
      cancelled = true;
    };
  }, [me, attempt]);

  // Wallet disconnected: end the chat session on the server too.
  const hadSession = useRef(false);
  useEffect(() => {
    if (session) hadSession.current = true;
    if (!address && hadSession.current) {
      hadSession.current = false;
      setSession(null);
      setMessages([]);
      lastId.current = 0;
      fetch("/api/chat/session", { method: "DELETE" }).catch(() => {});
    }
  }, [address, session]);

  const signedOut = useCallback(() => {
    setSession(null);
    setStatus("signed_out");
  }, []);

  // Group list with latest messages.
  useEffect(() => {
    if (!signedIn) return;
    let timer: number | undefined;
    const tick = async () => {
      if (!document.hidden) {
        const res = await api<{ groups?: Summary[] }>("/api/chat/groups").catch(() => null);
        if (res?.status === 401) return signedOut();
        if (res?.ok && res.body.groups) setSummaries(res.body.groups);
      }
      timer = window.setTimeout(tick, LIST_POLL_MS);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [signedIn, signedOut]);

  const pull = useCallback(async () => {
    const { ok, status: code, body } = await api<{ messages?: ChatMessage[] }>(
      `/api/chat/messages?group=${groupId}&after=${lastId.current}`,
    );
    if (code === 401) return signedOut();
    if (!ok || !body.messages?.length) return;
    const fresh = body.messages;
    lastId.current = fresh[fresh.length - 1].id;
    setMessages((prev) => [...prev, ...fresh.filter((m) => !prev.some((p) => p.id === m.id))].slice(-200));
  }, [groupId, signedOut]);

  // Messages of the open group.
  useEffect(() => {
    if (!signedIn || locked) return;
    let timer: number | undefined;
    const tick = async () => {
      if (!document.hidden) await pull().catch(() => {});
      timer = window.setTimeout(tick, POLL_MS);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [signedIn, locked, pull]);

  // Opening a group marks it read up to its newest message.
  const newest = messages.length ? messages[messages.length - 1].id : 0;
  useEffect(() => {
    if (!newest) return;
    const t = window.setTimeout(() => {
      setMarks((prev) => {
        if ((prev[groupId] ?? 0) >= newest) return prev;
        const next = { ...prev, [groupId]: newest };
        writeMarks(next);
        return next;
      });
    }, 0);
    return () => window.clearTimeout(t);
  }, [groupId, newest]);

  // Keep the newest message in view if the reader is already near the bottom.
  useEffect(() => {
    const el = list.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 160) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const choose = (next: ChatGroup) => {
    setShowRoom(true);
    if (next.id === groupId) return;
    setGroupId(next.id);
    setMessages([]);
    setError(null);
    lastId.current = 0;
  };

  const signIn = async () => {
    if (!address) return;
    setError(null);
    setStatus("signing");
    try {
      const challenge = await api<{ message?: string; error?: string }>("/api/chat/nonce", {
        method: "POST",
        body: JSON.stringify({ address }),
      });
      if (challenge.status === 503) return setStatus("not_configured");
      if (!challenge.body.message) throw new Error(challenge.body.error ?? "Could not start sign-in.");
      const signature = await signMessage(challenge.body.message);
      const result = await api<Session & { error?: string }>("/api/chat/session", {
        method: "POST",
        body: JSON.stringify({ address, message: challenge.body.message, signature }),
      });
      if (!result.ok) throw new Error(result.body.error ?? "Sign-in failed.");
      setMessages([]);
      lastId.current = 0;
      setSession(result.body);
      setStatus("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed.");
      setStatus("signed_out");
    }
  };

  const signOut = async () => {
    await fetch("/api/chat/session", { method: "DELETE" }).catch(() => {});
    setMessages([]);
    setSummaries([]);
    lastId.current = 0;
    signedOut();
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const result = await api<{ message?: ChatMessage; error?: string }>("/api/chat/messages", {
        method: "POST",
        body: JSON.stringify({ group: groupId, text }),
      });
      if (result.status === 401) return signedOut();
      if (!result.ok || !result.body.message) throw new Error(result.body.error ?? "The message did not go through.");
      setDraft("");
      await pull();
      if (list.current) list.current.scrollTop = list.current.scrollHeight;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The message did not go through.");
    } finally {
      setSending(false);
    }
  };

  let gate: React.ReactNode = null;
  if (!address) {
    gate = (
      <Gate
        title="Connect to join the chat"
        text={`${TITLE} is wallet-only. Connect with WalletConnect or a browser wallet on ${CHAIN.name} to read and talk in the groups.`}
        action="Connect wallet"
        onAction={openWallet}
      />
    );
  } else if (status === "not_configured") {
    gate = <Gate title="The chat opens soon" text={`The groups are still being set up. Your wallet works everywhere else on the site in the meantime, so come back shortly to join ${TITLE}.`} />;
  } else if (status === "offline") {
    gate = (
      <Gate
        title="Could not reach the chat"
        text="Check your connection and try again."
        action="Retry"
        onAction={() => {
          setStatus("checking");
          setAttempt((n) => n + 1);
        }}
      />
    );
  } else if (!signedIn) {
    const checking = status === "checking" || status === "idle";
    gate = (
      <Gate
        title={checking ? "Checking your seat…" : "Sign in with your wallet"}
        text="One signature proves the address is yours. It is free, sends no transaction and moves no tokens."
        action={status === "signing" ? "Confirm in wallet…" : checking ? undefined : "Sign in to chat"}
        busy={status === "signing"}
        onAction={signIn}
        error={error}
      />
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <header className="z-30 shrink-0 border-b border-line-2 bg-card">
        <div className="mx-auto flex h-[62px] max-w-[1280px] items-center justify-between gap-2 px-3 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <Mark size={32} />
            <span className="truncate serif text-[21px] sm:text-[23px]">{TITLE}</span>
          </Link>
          <nav className="hidden items-center gap-1 text-[15px] font-semibold text-ink-2 lg:flex">
            {[
              ["/", "Home"],
              ["/vaults", "Vaults"],
              ["/borrow", "Borrow"],
              ["/swap", "Buy $ARTER"],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="rounded-[3px] px-3 py-2 hover:bg-brass-soft hover:text-ink">
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <CopyCaTag compact />
            <NavWallet compact />
          </div>
        </div>
      </header>

      {gate ? (
        <main className="flex min-h-0 flex-1 items-center justify-center px-4">{gate}</main>
      ) : (
        <main className="mx-auto grid min-h-0 w-full max-w-[1280px] flex-1 grid-cols-1 md:grid-cols-[300px_1fr] md:border-x md:border-line-2">
          <aside className={`min-h-0 flex-col bg-paper-2/60 md:border-r md:border-line-2 ${showRoom ? "hidden md:flex" : "flex"}`} data-testid="chat-groups">
            <div className="border-b border-line-2 px-4 py-3">
              <p className="label">Groups</p>
              <p className="mt-1 truncate text-sm text-ink-2">
                as <span className="font-mono font-semibold text-ink">{shortAddress(session?.address ?? "", 6, 4)}</span>
                {session?.holder ? <span className="ml-1.5 rounded-[3px] border border-ink bg-brass-soft px-1.5 text-xs font-semibold">holder</span> : null}
              </p>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto p-2">
              {GROUPS.map((g) => {
                const summary = summaries.find((s) => s.id === g.id);
                const unread = summary?.last && summary.last.id > (marks[g.id] ?? 0) && g.id !== groupId;
                const active = g.id === groupId;
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => choose(g)}
                      className={`flex w-full cursor-pointer items-start gap-3 rounded border px-3 py-3 text-left transition-colors ${
                        active ? "border-line-2 bg-card" : "border-transparent hover:bg-card/70"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[3px] border border-line-2 ${active ? "bg-brass-soft" : "bg-card"}`}
                      >
                        {g.holdersOnly ? <Lock className="size-4" /> : <Hash className="size-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-bold">{g.name}</span>
                          {unread ? <span className="size-2.5 shrink-0 rounded-full border border-ink bg-rust" aria-label="Unread" /> : null}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-ink-3">
                          {summary?.locked
                            ? `Hold ${BRAND.symbol} to enter`
                            : summary?.last
                              ? `${summary.last.address === me ? "you" : shortAddress(summary.last.address, 4, 4)}: ${summary.last.text}`
                              : g.about}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-line-2 p-3">
              <button
                type="button"
                onClick={signOut}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded px-3 py-2 font-mono text-[11px] font-semibold tracking-[0.1em] text-ink-2 uppercase hover:bg-card hover:text-ink"
              >
                <LogOut className="size-3.5" /> Leave the chat
              </button>
            </div>
          </aside>

          <section className={`min-h-0 flex-col ${showRoom ? "flex" : "hidden md:flex"}`} aria-label={group.name}>
            <div className="flex items-center gap-3 border-b border-line-2 bg-card px-4 py-3">
              <button
                type="button"
                onClick={() => setShowRoom(false)}
                aria-label="Back to groups"
                className="cursor-pointer p-1 text-ink-2 hover:text-ink md:hidden"
              >
                <ArrowLeft className="size-5" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate serif text-[22px] leading-tight" data-testid="chat-room-name">
                  {group.name}
                </h1>
                <p className="truncate text-xs text-ink-3">{group.about}</p>
              </div>
            </div>

            {locked ? (
              <Gate
                title="Holders only"
                text={`${group.name} opens for wallets holding ${BRAND.symbol}. Your balance is re-checked about once a minute, so access follows shortly after you buy.`}
                linkHref="/swap"
                linkLabel={`Get ${BRAND.symbol}`}
              />
            ) : (
              <>
                <div ref={list} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" data-testid="chat-list">
                  {messages.length === 0 ? (
                    <p className="pt-12 text-center text-sm text-ink-3">No messages in {group.name} yet. Start the thread.</p>
                  ) : null}
                  {messages.map((m) => {
                    const mine = m.address === me;
                    return (
                      <div key={m.id} className={`flex gap-2.5 ${mine ? "flex-row-reverse" : ""}`}>
                        <span
                          aria-hidden="true"
                          className="mt-1 size-7 shrink-0 rounded-full border border-ink"
                          style={{ background: `hsl(${hue(m.address)} 70% 55%)` }}
                        />
                        <div className={`flex max-w-[78%] min-w-0 flex-col ${mine ? "items-end" : ""}`}>
                          <p className="flex items-center gap-1.5 font-mono text-[10px] text-ink-3">
                            <a href={explorerAddress(m.address)} target="_blank" rel="noreferrer" className="hover:text-ink hover:underline">
                              {mine ? "you" : shortAddress(m.address, 4, 4)}
                            </a>
                            {m.holder ? <span className="rounded-[3px] border border-ink bg-brass-soft px-1 text-ink">holder</span> : null}
                            <span>{time(m.at)}</span>
                          </p>
                          <p
                            className={`mt-1 rounded-[3px] px-3 py-2 text-sm leading-snug break-words whitespace-pre-wrap ${
                              mine ? "rounded-tr-sm border border-moss bg-moss-soft" : "rounded-tl-sm border border-line-2 bg-card"
                            }`}
                          >
                            {m.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={send} className="border-t border-line-2 bg-card p-3">
                  {error ? (
                    <p role="alert" className="mb-2 px-1 text-xs text-rust">
                      {error}
                    </p>
                  ) : null}
                  <div className="flex items-end gap-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          e.currentTarget.form?.requestSubmit();
                        }
                      }}
                      rows={1}
                      placeholder={`Message ${group.name}`}
                      aria-label="Message"
                      data-testid="chat-input"
                      className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded border border-ink bg-paper px-3 py-2.5 text-sm outline-none placeholder:text-ink-3 focus:bg-brass-soft"
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim() || sending}
                      aria-label="Send"
                      data-testid="chat-send"
                      className="btn btn-brass size-11 shrink-0"
                    >
                      <Send className="size-4" />
                    </button>
                  </div>
                  <p className="mt-1.5 px-1 text-right font-mono text-[10px] text-ink-3">
                    {draft.length}/{MAX_LENGTH}
                  </p>
                </form>
              </>
            )}
          </section>
        </main>
      )}
    </div>
  );
}

function Gate({
  title,
  text,
  action,
  onAction,
  busy = false,
  error,
  linkHref,
  linkLabel,
}: {
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
  busy?: boolean;
  error?: string | null;
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center px-6 py-10 text-center" data-testid="chat-gate">
      <Mark size={64} />
      <p className="mt-5 serif text-[28px]">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">{text}</p>
      {action && onAction ? (
        <button type="button" onClick={onAction} disabled={busy} className="btn btn-ink mt-6 h-12 px-7 text-sm" data-testid="chat-gate-action">
          {action}
        </button>
      ) : null}
      {linkHref && linkLabel ? (
        <Link href={linkHref} className="btn btn-brass mt-6 h-12 px-7 text-sm">
          {linkLabel}
        </Link>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-xs text-rust">
          {error}
        </p>
      ) : null}
    </div>
  );
}
