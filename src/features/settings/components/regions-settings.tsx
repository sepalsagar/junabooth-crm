"use client";
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { useTransition } from "react";
import { toast } from "sonner";
import { saveRegion } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
type Region = { id: string; name: string; active: boolean };
export function RegionsSettings({ regions }: { regions: Region[] }) { const [pending, start] = useTransition(); const save = (input: unknown) => start(async () => { const r = await saveRegion(input); r.ok ? toast.success("Region saved") : toast.error(r.error); }); return <div className="space-y-5"><div><h1 className="text-2xl font-bold">Regions</h1><p className="text-sm text-muted-foreground">Maintain the cities and operating regions used by the team.</p></div><form className="flex gap-2 rounded-lg border p-4" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); save({ name: f.get("name"), active: true }); e.currentTarget.reset(); }}><Input name="name" placeholder="Region name" required /><Button disabled={pending}>Add region</Button></form><div className="space-y-2">{regions.map((region) => <form key={region.id} className="flex gap-2 rounded-lg border p-3" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); save({ id: region.id, name: f.get("name"), active: f.get("active") === "on" }); }}><Input name="name" defaultValue={region.name} required /><label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={region.active} /> Active</label><Button variant="outline" disabled={pending}>Save</Button></form>)}</div></div>; }
