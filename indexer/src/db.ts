import { JSONFilePreset } from "lowdb/node";

export interface TxRecord {
  id: number;
  blockNumber: number;
  blockHash: string;
  kind: string;
  from: string;
  to: string;
  amount: string;
  postId: number | null;
  appId: number | null;
  timestamp: number;
}

export interface EventRecord {
  id: number;
  blockNumber: number;
  blockHash: string;
  pallet: string;
  eventName: string;
  data: Record<string, unknown>;
  timestamp: number;
}

interface Data {
  lastBlock: number;
  nextId: number;
  events: EventRecord[];
  txLog: TxRecord[];
}

const defaultData: Data = { lastBlock: 0, nextId: 1, events: [], txLog: [] };
const db = await JSONFilePreset<Data>("data.json", defaultData);

export async function getLastBlock(): Promise<number> {
  await db.read();
  return db.data.lastBlock;
}

export async function setLastBlock(n: number) {
  db.data.lastBlock = n;
  await db.write();
}

export async function insertEvent(e: Omit<EventRecord, "id">): Promise<EventRecord> {
  const record = { ...e, id: db.data.nextId++ };
  db.data.events.push(record);
  if (db.data.events.length > 10000) db.data.events = db.data.events.slice(-10000);
  await db.write();
  return record;
}

export async function insertTx(t: Omit<TxRecord, "id">): Promise<TxRecord> {
  const record = { ...t, id: db.data.nextId++ };
  db.data.txLog.push(record);
  if (db.data.txLog.length > 10000) db.data.txLog = db.data.txLog.slice(-10000);
  await db.write();
  return record;
}

export function getTxByAddress(address: string, limit = 50): TxRecord[] {
  return db.data.txLog
    .filter((t) => t.from === address || t.to === address)
    .sort((a, b) => b.id - a.id)
    .slice(0, limit);
}

export function getRecentEvents(limit = 50): EventRecord[] {
  return db.data.events.slice(-limit).reverse();
}

export function getEventsByPallet(pallet: string, limit = 50): EventRecord[] {
  return db.data.events
    .filter((e) => e.pallet === pallet)
    .slice(-limit)
    .reverse();
}

export function getPostEarnings(postId: number): number {
  return db.data.txLog
    .filter((t) => t.postId === postId && (t.kind === "ReplyFeeEarned" || t.kind === "UnlockFeeEarned"))
    .reduce((sum, t) => sum + parseInt(t.amount || "0"), 0);
}

export function getStats() {
  return {
    totalEvents: db.data.events.length,
    totalTx: db.data.txLog.length,
    lastBlock: db.data.lastBlock,
  };
}
