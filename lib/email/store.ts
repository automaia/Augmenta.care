import { promises as fs } from "node:fs";
import path from "node:path";

export type PreSale = {
  email: string;
  firstName?: string;
  status: "pending" | "paid" | "refunded";
  amountCents: number;
  currency: string;
  stripeSessionId?: string;
  createdAt: string;
  paidAt?: string;
};

export type Unsubscribe = {
  email: string;
  reason?: string;
  source: "link" | "admin" | "brevo_webhook";
  createdAt: string;
};

export type EmailEvent = {
  id: string;
  email: string;
  step: 1 | 2 | 3;
  variant: "A" | "B";
  event:
    | "delivered"
    | "opened"
    | "clicked"
    | "unsubscribed"
    | "spam"
    | "bounce"
    | "request"
    | "deferred";
  messageId?: string;
  link?: string;
  raw?: unknown;
  occurredAt: string;
  receivedAt: string;
};

export type Contact = {
  email: string;
  firstName?: string;
  signupAt?: string;
  source?: string;
  consentRgpd: boolean;
};

export type SendLogEntry = {
  id: string;
  step: 1 | 2 | 3;
  variant: "A" | "B";
  email: string;
  firstName?: string;
  subject: string;
  messageId?: string;
  dryRun: boolean;
  status: "queued" | "sent" | "failed" | "skipped_excluded";
  excludeReasons?: string[];
  error?: string;
  sentAt: string;
};

export type VoiceCallIntention =
  | "prise_rdv"
  | "urgence"
  | "devis"
  | "support"
  | "info";

export type VoiceCall = {
  id: string;
  callId: string;
  callerNumber: string;
  timestampStart: string;
  timestampEnd: string;
  durationSeconds: number;
  transcription: string;
  intention: VoiceCallIntention;
  rdvDate?: string;
  rdvHeure?: string;
  notes?: string;
  routedTo: string;
  ticketIssueId?: string;
  ticketStatus: "pending" | "created" | "skipped" | "failed";
  ticketError?: string;
  raw: unknown;
  receivedAt: string;
};

export type StoreSchema = {
  contacts: Contact[];
  preSales: PreSale[];
  unsubscribes: Unsubscribe[];
  emailEvents: EmailEvent[];
  sendLog: SendLogEntry[];
  voiceCalls: VoiceCall[];
};

const EMPTY: StoreSchema = {
  contacts: [],
  preSales: [],
  unsubscribes: [],
  emailEvents: [],
  sendLog: [],
  voiceCalls: [],
};

function defaultStorePath(): string {
  if (process.env.PAPERCLIP_STORE_PATH) return process.env.PAPERCLIP_STORE_PATH;
  return path.join(process.cwd(), "data", "store.json");
}

async function ensureDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function readRaw(filePath: string): Promise<StoreSchema> {
  try {
    const buf = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(buf) as Partial<StoreSchema>;
    return {
      contacts: parsed.contacts ?? [],
      preSales: parsed.preSales ?? [],
      unsubscribes: parsed.unsubscribes ?? [],
      emailEvents: parsed.emailEvents ?? [],
      sendLog: parsed.sendLog ?? [],
      voiceCalls: parsed.voiceCalls ?? [],
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        ...EMPTY,
        contacts: [],
        preSales: [],
        unsubscribes: [],
        emailEvents: [],
        sendLog: [],
        voiceCalls: [],
      };
    }
    throw err;
  }
}

async function writeRaw(filePath: string, data: StoreSchema): Promise<void> {
  await ensureDir(filePath);
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, filePath);
}

const locks = new Map<string, Promise<unknown>>();

function withFileLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(filePath) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(fn);
  locks.set(
    filePath,
    next.catch(() => undefined),
  );
  return next;
}

export async function readStore(): Promise<StoreSchema> {
  const filePath = defaultStorePath();
  return readRaw(filePath);
}

export async function mutateStore<T>(
  mutator: (
    state: StoreSchema,
  ) =>
    | Promise<{ next: StoreSchema; result: T }>
    | { next: StoreSchema; result: T },
): Promise<T> {
  const filePath = defaultStorePath();
  return withFileLock(filePath, async () => {
    const current = await readRaw(filePath);
    const outcome = await mutator(current);
    await writeRaw(filePath, outcome.next);
    return outcome.result;
  });
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isExcluded(
  state: StoreSchema,
  email: string,
): { excluded: boolean; reasons: string[] } {
  const norm = normalizeEmail(email);
  const reasons: string[] = [];
  const paid = state.preSales.find(
    (p) => normalizeEmail(p.email) === norm && p.status === "paid",
  );
  if (paid) reasons.push("already_paid");
  const unsub = state.unsubscribes.find(
    (u) => normalizeEmail(u.email) === norm,
  );
  if (unsub) reasons.push("unsubscribed");
  const bounced = state.emailEvents.find(
    (e) =>
      normalizeEmail(e.email) === norm &&
      (e.event === "spam" || e.event === "bounce"),
  );
  if (bounced) reasons.push(`hard_${bounced.event}`);
  return { excluded: reasons.length > 0, reasons };
}

export function summarizeSendLog(log: SendLogEntry[]): {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  dryRun: number;
  byStep: Record<
    string,
    { sent: number; failed: number; skipped: number; dryRun: number }
  >;
  byVariant: Record<"A" | "B", number>;
  lastSentAt: string | null;
} {
  const summary = {
    total: log.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    dryRun: 0,
    byStep: {} as Record<
      string,
      { sent: number; failed: number; skipped: number; dryRun: number }
    >,
    byVariant: { A: 0, B: 0 } as Record<"A" | "B", number>,
    lastSentAt: null as string | null,
  };
  for (const entry of log) {
    if (entry.status === "sent") summary.sent += 1;
    if (entry.status === "failed") summary.failed += 1;
    if (entry.status === "skipped_excluded") summary.skipped += 1;
    if (entry.dryRun) summary.dryRun += 1;
    const stepKey = `step_${entry.step}`;
    const bucket = summary.byStep[stepKey] ?? {
      sent: 0,
      failed: 0,
      skipped: 0,
      dryRun: 0,
    };
    if (entry.status === "sent") bucket.sent += 1;
    if (entry.status === "failed") bucket.failed += 1;
    if (entry.status === "skipped_excluded") bucket.skipped += 1;
    if (entry.dryRun) bucket.dryRun += 1;
    summary.byStep[stepKey] = bucket;
    summary.byVariant[entry.variant] =
      (summary.byVariant[entry.variant] ?? 0) + 1;
    if (entry.status === "sent") {
      if (!summary.lastSentAt || entry.sentAt > summary.lastSentAt) {
        summary.lastSentAt = entry.sentAt;
      }
    }
  }
  return summary;
}

export function summarizeEvents(events: EmailEvent[]): {
  total: number;
  byType: Record<string, number>;
  uniqueOpens: number;
  uniqueClicks: number;
  unsubscribed: number;
  spammed: number;
  lastEventAt: string | null;
} {
  const summary = {
    total: events.length,
    byType: {} as Record<string, number>,
    uniqueOpens: 0,
    uniqueClicks: 0,
    unsubscribed: 0,
    spammed: 0,
    lastEventAt: null as string | null,
  };
  const openedContacts = new Set<string>();
  const clickedContacts = new Set<string>();
  for (const ev of events) {
    summary.byType[ev.event] = (summary.byType[ev.event] ?? 0) + 1;
    if (ev.event === "opened") openedContacts.add(normalizeEmail(ev.email));
    if (ev.event === "clicked") clickedContacts.add(normalizeEmail(ev.email));
    if (ev.event === "unsubscribed") summary.unsubscribed += 1;
    if (ev.event === "spam") summary.spammed += 1;
    if (!summary.lastEventAt || ev.occurredAt > summary.lastEventAt) {
      summary.lastEventAt = ev.occurredAt;
    }
  }
  summary.uniqueOpens = openedContacts.size;
  summary.uniqueClicks = clickedContacts.size;
  return summary;
}
