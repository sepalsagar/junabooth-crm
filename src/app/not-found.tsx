import Link from "next/link";

export default function NotFound() {
  return <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6 text-center"><h1 className="text-2xl font-semibold">Page not found</h1><p className="text-muted-foreground">That Junabooth CRM page doesn’t exist.</p><Link className="rounded-md bg-primary px-4 py-2 text-primary-foreground" href="/overview">Back to overview</Link></main>;
}
