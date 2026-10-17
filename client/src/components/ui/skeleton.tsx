"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { usePreferences } from "@/providers/preferences-provider";

/**
 * Loading placeholders that mirror each page's real layout, so nothing jumps
 * when the data arrives. Only the page heading is real text; everything below
 * it is built from these blocks.
 */

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("skeleton block", className)} />;
}

/** Announces the loading state once instead of every block. */
export function SkeletonRegion({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { locale } = usePreferences();
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{locale === "de" ? "Wird geladen …" : "Loading …"}</span>
      {children}
    </div>
  );
}

const repeat = <T,>(count: number, render: (index: number) => T): T[] =>
  Array.from({ length: count }, (_, index) => render(index));

const listBox =
  "overflow-hidden rounded-[var(--container-radius)] border border-[color-mix(in_srgb,var(--border)_82%,transparent)] bg-[var(--surface)]";
const rowDivider = "border-t border-[color-mix(in_srgb,var(--border)_54%,transparent)]";

/** The summary panel at the top of the dashboards. */
function SummarySkeleton({ columns }: { columns: 4 | 5 }) {
  return (
    <section className="desk-panel overflow-hidden">
      <div
        className={cn(
          "grid grid-cols-2 divide-[color-mix(in_srgb,var(--border)_80%,transparent)] lg:divide-x [&>*:nth-child(-n+2)]:max-lg:border-b [&>*:nth-child(odd)]:max-lg:border-r",
          columns === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4",
        )}
      >
        {repeat(columns, (index) => (
          <div key={index} className="summary-figure">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-3 w-36 max-w-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

function PanelHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="size-10 shrink-0 rounded-xl" />
      <div className="grid gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48 max-w-full" />
      </div>
    </div>
  );
}

function ListPanelSkeleton({ rows }: { rows: number }) {
  return (
    <section className="desk-panel overflow-hidden">
      <div className="p-5 pb-3">
        <PanelHeaderSkeleton />
      </div>
      <ul className="grid gap-1.5 px-3 pb-3">
        {repeat(rows, (index) => (
          <li key={index} className="flex min-h-16 items-center gap-3 px-2.5 py-2">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="grid min-w-0 flex-1 gap-2">
              <Skeleton className="h-3.5 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
            <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChartPanelSkeleton() {
  return (
    <section className="desk-panel overflow-hidden p-5">
      <PanelHeaderSkeleton />
      <Skeleton className="mt-4 h-40 w-full" />
    </section>
  );
}

export function DashboardSkeleton() {
  return (
    <SkeletonRegion className="space-y-5">
      <SummarySkeleton columns={4} />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
        <div className="grid min-w-0 gap-5">
          <ListPanelSkeleton rows={3} />
          <section className="desk-panel overflow-hidden p-5">
            <PanelHeaderSkeleton />
            <div className="mt-4 grid grid-cols-7 gap-2">
              {repeat(7, (index) => (
                <Skeleton key={index} className="h-24" />
              ))}
            </div>
          </section>
        </div>
        <div className="grid min-w-0 gap-5">
          <section className="desk-panel overflow-hidden p-5">
            <PanelHeaderSkeleton />
            <div className="mt-4 grid gap-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-11/12" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
            <Skeleton className="mt-4 h-11 w-full rounded-full" />
          </section>
          <ChartPanelSkeleton />
        </div>
      </div>
    </SkeletonRegion>
  );
}

export function AdminOverviewSkeleton() {
  return (
    <SkeletonRegion className="space-y-5">
      <SummarySkeleton columns={5} />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,1fr)]">
        <ListPanelSkeleton rows={3} />
        <ChartPanelSkeleton />
      </div>
    </SkeletonRegion>
  );
}

/** Task rows, shared by My tasks, All tasks and a user's task list. */
export function TaskListSkeleton({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <SkeletonRegion className={cn(listBox, className)}>
      <div className="hidden h-12 items-center border-b px-5 xl:flex">
        <Skeleton className="h-3 w-24" />
      </div>
      {repeat(rows, (index) => (
        <div
          key={index}
          className={cn(
            "flex min-h-[4.75rem] items-center gap-4 px-5 py-3",
            index > 0 && rowDivider,
          )}
        >
          <Skeleton className="size-5 shrink-0 rounded-full" />
          <div className="grid min-w-0 flex-1 gap-2">
            <Skeleton className="h-3.5 w-2/5 max-w-xs" />
            <Skeleton className="h-3 w-3/5 max-w-md" />
          </div>
          <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
          <Skeleton className="hidden h-6 w-16 rounded-full sm:block" />
          <Skeleton className="hidden h-4 w-24 lg:block" />
        </div>
      ))}
    </SkeletonRegion>
  );
}

export function UserListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <SkeletonRegion className={listBox}>
      <div className="hidden h-12 items-center border-b px-5 xl:flex">
        <Skeleton className="h-3 w-24" />
      </div>
      {repeat(rows, (index) => (
        <div
          key={index}
          className={cn(
            "flex min-h-[4.75rem] items-center gap-4 px-5 py-3",
            index > 0 && rowDivider,
          )}
        >
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="grid min-w-0 flex-1 gap-2">
            <Skeleton className="h-3.5 w-40 max-w-full" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
          <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
          <Skeleton className="hidden h-6 w-16 rounded-full sm:block" />
        </div>
      ))}
    </SkeletonRegion>
  );
}

export function UserDetailSkeleton() {
  return (
    <SkeletonRegion>
      <section className={listBox}>
        <div className="grid gap-5 p-5 md:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-6">
          <div>
            <div className="flex items-center gap-4 sm:gap-5">
              <Skeleton className="size-16 shrink-0 rounded-full sm:size-20" />
              <div className="grid gap-2.5">
                <Skeleton className="h-7 w-48 max-w-full" />
                <Skeleton className="h-4 w-56 max-w-full" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
          <div className="grid content-start gap-3 border-t pt-4 lg:min-w-40 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-full rounded-full" />
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
        </div>
        <div className="grid divide-y border-t sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {repeat(3, (index) => (
            <div key={index} className="flex min-h-20 items-center gap-3 px-5 py-4">
              <Skeleton className="size-5 shrink-0 rounded-md" />
              <div className="grid gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>
      </section>
      <Skeleton className="mt-8 h-5 w-32" />
      <TaskListSkeleton rows={4} className="mt-4" />
    </SkeletonRegion>
  );
}

/** Conversation list on the left, thread on the right: assistant, support, contact. */
export function ChatWorkspaceSkeleton() {
  return (
    <SkeletonRegion className="chat-workspace grid min-h-[38rem] overflow-hidden rounded-[var(--container-radius)] md:min-h-0 md:flex-1 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="flex min-h-0 min-w-0 flex-col border-r max-xl:border-r-0">
        <div className="chat-section-header flex h-16 shrink-0 items-center px-4">
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid gap-1 p-2">
          {repeat(5, (index) => (
            <div key={index} className="flex items-center gap-3 px-2 py-2.5">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="grid min-w-0 flex-1 gap-2">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </aside>
      <section className="hidden min-h-0 min-w-0 flex-col xl:flex">
        <div className="chat-section-header flex h-16 shrink-0 items-center gap-3 px-4">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="grid gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-4 p-5">
          <Skeleton className="h-14 w-2/5 rounded-2xl" />
          <Skeleton className="ml-auto h-10 w-1/3 rounded-2xl" />
          <Skeleton className="h-20 w-1/2 rounded-2xl" />
        </div>
        <div className="p-4">
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
      </section>
    </SkeletonRegion>
  );
}

/** Device rows in Settings → Security. */
export function SessionsSkeleton() {
  return (
    <SkeletonRegion className="mt-3 divide-y">
      {repeat(3, (index) => (
        <div key={index} className="flex items-center gap-3 py-4 first:pt-2">
          <Skeleton className="size-11 shrink-0 rounded-xl" />
          <div className="grid min-w-0 flex-1 gap-2">
            <Skeleton className="h-3.5 w-40 max-w-full" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      ))}
    </SkeletonRegion>
  );
}
