import { CHAIN, serverRpc } from "@/config/brand";

/**
 * eth_call reads from server code. Batches every call into one request,
 * and tries the configured endpoint before the public fallback.
 */
const endpoints = () => [serverRpc(), CHAIN.fallbackRpc].filter((u, i, all) => all.indexOf(u) === i);

export async function serverEthCalls(calls: { to: string; data: string }[]): Promise<(string | null)[]> {
  let lastError: unknown;
  for (const url of endpoints()) {
    try {
      const results: (string | null)[] = [];
      // Small chunks keep every public endpoint happy with the batch size.
      for (let i = 0; i < calls.length; i += 20) {
        const chunk = calls.slice(i, i + 20);
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            chunk.map((c, id) => ({ jsonrpc: "2.0", id, method: "eth_call", params: [{ to: c.to, data: c.data }, "latest"] })),
          ),
          cache: "no-store",
          signal: AbortSignal.timeout(12000),
        });
        if (!res.ok) throw new Error(`RPC ${res.status}`);
        const body = (await res.json()) as { id: number; result?: string }[];
        if (!Array.isArray(body)) throw new Error("Batch not supported");
        const byId = new Map(body.map((e) => [e.id, e.result ?? null]));
        chunk.forEach((_, id) => results.push(byId.get(id) ?? null));
      }
      return results;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
