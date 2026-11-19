"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
export function LoginForm() {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  return <form className="space-y-5" onSubmit={async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(false);
    try {
      const data = new FormData(event.currentTarget);
      const result = await authClient.signIn.email({ email: String(data.get("email")), password: String(data.get("password")) });
      if (result.error) return setError(true);
      router.push("/overview");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }}>
    <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div>
    <div><Label htmlFor="password">Password</Label><div className="relative"><Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required className="pr-10" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
    {error && <p className="text-sm text-destructive" role="alert">Invalid email or password</p>}
    <Button className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
  </form>;
}
