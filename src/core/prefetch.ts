// © 2026 typeof (Scolup) | Licensed under AGPL 3.0
import { PrefetchConfig } from '../types';
import { getConfig } from './store';
import { parseDuration } from './cache';
import { safeSetInterval, safeClearInterval } from './env';
import { getGrades } from '../modules/grades';
import { getMessages } from '../modules/messages';
import { getHomework } from '../modules/homework';
import { getTimetable } from '../modules/timetable';
import { getTimeline } from '../modules/timeline';

const DEFAULT_MODULES = ['grades', 'messages', 'homework', 'timetable', 'timeline'] as const;

export async function prefetchAll(config?: PrefetchConfig): Promise<void> {
  const finalConfig = { ...getConfig().prefetch, ...config };
  if (!finalConfig.enabled) return;

  const modules = finalConfig.modules || DEFAULT_MODULES;
  const tasks = buildPrefetchTasks(modules);

  await Promise.allSettled(tasks);
}

function buildPrefetchTasks(modules: readonly string[]): Promise<unknown>[] {
  const tasks: Promise<unknown>[] = [];

  for (const module of modules) {
    switch (module) {
      case 'grades':
        tasks.push(getGrades());
        break;
      case 'messages':
        tasks.push(getMessages({ withContent: true }));
        break;
      case 'homework':
        tasks.push(getHomework({ withContent: true }));
        break;
      case 'timetable':
        tasks.push(getTimetable());
        break;
      case 'timeline':
        tasks.push(getTimeline());
        break;
    }
  }

  return tasks;
}

let prefetchInterval: ReturnType<typeof setInterval> | undefined | null = null;

export function startAutoPrefetch(): void {
  const config = getConfig().prefetch;
  if (!config?.enabled || !config.interval) return;

  const ms = parseDuration(config.interval);
  if (ms <= 0) return;

  safeClearInterval(prefetchInterval ?? undefined);
  prefetchInterval = safeSetInterval(() => prefetchAll(), ms);
}

export function stopAutoPrefetch(): void {
  safeClearInterval(prefetchInterval ?? undefined);
  prefetchInterval = null;
}
