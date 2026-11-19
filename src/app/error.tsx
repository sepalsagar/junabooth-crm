"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6 text-center"><h1 className="text-2xl font-semibold">Something went wrong</h1><p className="text-muted-foreground">We couldn’t load this page. Please try again.</p><button className="rounded-md bg-primary px-4 py-2 text-primary-foreground" onClick={() => reset()}>Try again</button></main>;
}
