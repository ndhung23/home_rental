"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(result.error);
      return;
    }
    router.replace("/");
    router.refresh();
  };

  return (
    <form onSubmit={submit}>
      <label>Tên đăng nhập<input name="username" autoComplete="username" placeholder="Nhập tên đăng nhập" autoFocus required /></label>
      <label>Mật khẩu<input name="password" type="password" autoComplete="current-password" placeholder="Nhập mật khẩu" required /></label>
      {error && <p className="login-error">{error}</p>}
      <button className="primary-button" type="submit" disabled={loading}>{loading ? "Đang đăng nhập…" : "Đăng nhập"}</button>
    </form>
  );
}
