import { getPublisher } from "../platforms";
import { getAccount, mutateStore } from "../db";
import type { PostVariant } from "../types";

let started = false;

export function startScheduler() {
  if (started) return;
  started = true;
  void import("node-cron").then((cron) => {
    cron.default.schedule("* * * * *", () => {
      void tick();
    });
  });
  void tick();
}

export async function tick() {
  const due = mutateStore((store) => {
    const now = Date.now();
    const list = store.variants.filter(
      (v) => v.status === "scheduled" && v.scheduledAt && new Date(v.scheduledAt).getTime() <= now,
    );
    for (const v of list) v.status = "publishing";
    return list.map((v) => v.id);
  });

  for (const id of due) {
    await publishVariant(id);
  }
}

export async function publishVariant(variantId: string) {
  const snapshot = mutateStore((store) => store.variants.find((v) => v.id === variantId));
  if (!snapshot) return;

  const account =
    mutateStore((store) =>
      snapshot.accountId
        ? store.accounts.find((a) => a.id === snapshot.accountId) ?? getAccount(store, snapshot.platform)
        : getAccount(store, snapshot.platform),
    ) ??
    ({
      id: "temp",
      platform: snapshot.platform,
      displayName: snapshot.platform,
      status: "disconnected" as const,
      hint: "",
      updatedAt: new Date().toISOString(),
      credentials: {},
      bindMethod: null,
      boundAt: null,
      profileUrl: null,
    });

  try {
    const result = await getPublisher(snapshot.platform).publish(account, {
      title: snapshot.content.title,
      text: snapshot.content.text,
      html: snapshot.content.html,
      digest: snapshot.content.digest,
      tags: snapshot.content.tags,
      coverImage: snapshot.content.coverImage,
      original: Boolean(snapshot.content.digest),
    });
    mutateStore((store) => {
      const v = store.variants.find((x) => x.id === variantId);
      if (!v) return;
      if (result.ok) {
        v.status = "published";
        v.publishedAt = new Date().toISOString();
        v.remoteId = result.remoteId ?? null;
        v.remoteUrl = result.url ?? null;
        v.error = result.dryRun ? "dry-run" : null;
      } else {
        v.status = "failed";
        v.error = result.message;
      }
    });
  } catch (error) {
    mutateStore((store) => {
      const v = store.variants.find((x) => x.id === variantId);
      if (!v) return;
      v.status = "failed";
      v.error = error instanceof Error ? error.message : "未知错误";
    });
  }
}

export function dueVariants(): PostVariant[] {
  const now = Date.now();
  return mutateStore((store) =>
    store.variants.filter(
      (v) => v.status === "scheduled" && v.scheduledAt && new Date(v.scheduledAt).getTime() <= now,
    ),
  );
}
