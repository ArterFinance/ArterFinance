import { createPublicClient, defineChain, http } from "viem";

const RPC = process.env.ARTER_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
export const chain = defineChain({ id: 4663, name: "Robinhood Chain", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [RPC] } } });
export const client = createPublicClient({ chain, transport: http(RPC) });
