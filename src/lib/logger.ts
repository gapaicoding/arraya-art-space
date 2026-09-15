/**
 * Minimal structured error logging — no external service required.
 *
 * Server-side calls (in Server Components/Actions/middleware) land in
 * Vercel's Runtime Logs since Vercel captures stdout/stderr from serverless
 * functions. Client-side calls (error boundaries, browser-side Supabase
 * queries) only reach the browser console — there's no external monitoring
 * (e.g. Sentry) wired up yet, so those are only visible if someone is
 * actually looking at DevTools when it happens. This is a stopgap, not a
 * replacement for real monitoring — see docs/stage-5-p1-improve-plan.md.
 */
export function logError(scope: string, error: unknown, context?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(
    JSON.stringify({
      level: "error",
      timestamp: new Date().toISOString(),
      scope,
      message,
      stack,
      ...context,
    }),
  );
}
