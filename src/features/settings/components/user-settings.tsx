"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createSettingsUser,
  resetSettingsUserPassword,
  updateSettingsUser,
} from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type User = {
  id: string;
  name: string;
  email: string;
  role: "PARTNER" | "SALES" | "OPERATOR";
  disabled: boolean;
};
export function UserSettings({ users }: { users: User[] }) {
  const [pending, start] = useTransition();
  const [newPassword, setNewPassword] = useState<Record<string, string>>({});
  const run = (task: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const response = await task();
      response.ok ? toast.success("Saved") : toast.error(response.error);
    });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">
          Partner-only account administration.
        </p>
      </div>
      <form
        className="grid gap-2 rounded-lg border p-4 sm:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          run(() =>
            createSettingsUser({
              name: String(form.get("name")),
              email: String(form.get("email")),
              password: String(form.get("password")),
              role: String(form.get("role")),
            }),
          );
          event.currentTarget.reset();
        }}
      >
        <Input name="name" placeholder="Name" required />
        <Input name="email" type="email" placeholder="Email" required />
        <Input
          name="password"
          type="password"
          minLength={8}
          placeholder="Temporary password"
          required
        />
        <select
          name="role"
          className="h-9 rounded-md border bg-background px-2"
        >
          <option>SALES</option>
          <option>OPERATOR</option>
          <option>PARTNER</option>
        </select>
        <Button disabled={pending}>Create user</Button>
      </form>
      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
          >
            <div>
              <div className="font-medium">
                {user.name}{" "}
                {user.disabled && (
                  <span className="text-xs text-destructive">(Disabled)</span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
            <select
              value={user.role}
              disabled={pending}
              onChange={(event) =>
                run(() =>
                  updateSettingsUser({
                    userId: user.id,
                    role: event.target.value,
                    disabled: user.disabled,
                  }),
                )
              }
              className="h-9 rounded-md border bg-background px-2"
            >
              <option>PARTNER</option>
              <option>SALES</option>
              <option>OPERATOR</option>
            </select>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(() =>
                  updateSettingsUser({
                    userId: user.id,
                    role: user.role,
                    disabled: !user.disabled,
                  }),
                )
              }
            >
              {user.disabled ? "Enable" : "Disable"}
            </Button>
            <div className="flex gap-2">
              <Input
                value={newPassword[user.id] ?? ""}
                onChange={(event) =>
                  setNewPassword((current) => ({
                    ...current,
                    [user.id]: event.target.value,
                  }))
                }
                placeholder="New password"
                type="password"
                minLength={8}
              />
              <Button
                variant="outline"
                disabled={pending || (newPassword[user.id] ?? "").length < 8}
                onClick={() =>
                  run(() =>
                    resetSettingsUserPassword({
                      userId: user.id,
                      password: newPassword[user.id],
                    }),
                  )
                }
              >
                Reset
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
