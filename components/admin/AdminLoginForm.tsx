"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { loginSchema } from "@/lib/validation/schemas";

type LoginValues = z.infer<typeof loginSchema>;
const subscribeToHydration = () => () => undefined;

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function submit(values: LoginValues) {
    setServerError(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result = (await response.json()) as {
      success: boolean;
      error?: { message?: string };
    };
    if (!response.ok || !result.success) {
      setServerError(result.error?.message ?? "Unable to sign in.");
      return;
    }
    const requested = searchParams.get("next");
    const destination =
      requested?.startsWith("/admin") && !requested.startsWith("//")
        ? requested
        : "/admin";
    router.replace(destination);
    router.refresh();
  }

  return (
    <form
      data-hydrated={hydrated}
      onSubmit={(event) => void handleSubmit(submit)(event)}
      noValidate
    >
      <div className="field">
        <label htmlFor="email">Administrator email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          {...register("email")}
        />
        {errors.email ? (
          <span className="field-error">{errors.email.message}</span>
        ) : null}
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password ? (
          <span className="field-error">{errors.password.message}</span>
        ) : null}
      </div>
      {serverError ? (
        <p className="field-error" role="alert">
          {serverError}
        </p>
      ) : null}
      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />
        ) : (
          <ArrowRight size={18} aria-hidden="true" />
        )}
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
