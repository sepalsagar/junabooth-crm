"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
export function LoginForm() { const [error, setError] = useState(false); const [loading, setLoading] = useState(false); const router = useRouter(); return <form className="space-y-5" onSubmit={async (event) => { event.preventDefault(); setLoading(true); setError(false); const data = new FormData(event.currentTarget); const result = await authClient.signIn.email({ email: String(data.get("email")), password: String(data.get("password")) }); setLoading(false); if (result.error) return setError(true); router.push("/overview"); router.refresh(); }}><div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></div><div><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" required /></div>{error && <p className="text-sm text-destructive">Invalid email or password</p>}<Button className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button></form>; }
