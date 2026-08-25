import type { Intervention, Plan } from "../api";

/**
 * Immutable local proposal history. It never mutates the analysed city or the
 * backend plan. Every edit creates a revision whose parent is the revision the
 * user was viewing, allowing undo and parallel alternatives.
 */
export type DraftChangeKind = "add_intervention" | "remove_intervention" | "replace_land_use" | "note";

export interface DraftChange {
  id: string;
  kind: DraftChangeKind;
  summary: string;
  intervention?: Intervention;
  targetId?: string;
  metadata?: Record<string, string>;
}

export interface DraftRevision {
  id: string;
  parentId: string | null;
  createdAt: string;
  label: string;
  changes: DraftChange[];
}

export interface DraftPlanHistory {
  basePlan: Plan;
  revisions: Record<string, DraftRevision>;
  currentRevisionId: string | null;
}

export function createDraftHistory(basePlan: Plan): DraftPlanHistory {
  return { basePlan, revisions: {}, currentRevisionId: null };
}

export function appendDraftRevision(
  history: DraftPlanHistory,
  label: string,
  changes: DraftChange[],
): DraftPlanHistory {
  const revision: DraftRevision = {
    id: `revision-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    parentId: history.currentRevisionId,
    createdAt: new Date().toISOString(),
    label,
    changes,
  };
  return {
    ...history,
    revisions: { ...history.revisions, [revision.id]: revision },
    currentRevisionId: revision.id,
  };
}

export function selectDraftRevision(history: DraftPlanHistory, revisionId: string | null): DraftPlanHistory {
  if (revisionId !== null && !history.revisions[revisionId]) return history;
  return { ...history, currentRevisionId: revisionId };
}

/** Returns the original-to-current change chain for the selected revision. */
export function currentDraftChanges(history: DraftPlanHistory): DraftChange[] {
  const chain: DraftRevision[] = [];
  let cursor = history.currentRevisionId;
  while (cursor) {
    const revision = history.revisions[cursor];
    if (!revision) break;
    chain.unshift(revision);
    cursor = revision.parentId;
  }
  return chain.flatMap((revision) => revision.changes);
}

/** Undo selects a parent; it never deletes an alternative revision/branch. */
export function undoDraftRevision(history: DraftPlanHistory): DraftPlanHistory {
  if (!history.currentRevisionId) return history;
  return selectDraftRevision(history, history.revisions[history.currentRevisionId]?.parentId ?? null);
}

export function childDraftRevisions(history: DraftPlanHistory, parentId: string | null): DraftRevision[] {
  return Object.values(history.revisions)
    .filter((revision) => revision.parentId === parentId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
