import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function ForbiddenPage() { return <main className="grid min-h-screen place-items-center bg-background p-6"><div className="text-center"><h1 className="text-3xl font-bold">Access denied</h1><p className="mt-2 text-muted-foreground">You do not have permission to view this page.</p><Button className="mt-5" render={<Link href="/overview" />}>Return to overview</Button></div></main>; }
