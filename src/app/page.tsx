"use client";

import { useRef, useState } from "react";

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function onUploadClick() {
    const input = fileInputRef.current;
    const file = input?.files?.[0];
    if (!file || uploading) return;

    setUploading(true);
    setUploadMessage(null);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const bodyText = await res.text();
      let data:
        | { text: string; documentId: string; chunkCount: number }
        | { error: string; details?: string };
      try {
        data = JSON.parse(bodyText) as typeof data;
      } catch {
        throw new Error(
          res.ok
            ? "Invalid response from server."
            : `Upload failed (${res.status}). The server returned an error page instead of JSON.`,
        );
      }

      if (!res.ok) {
        const details =
          "details" in data && data.details
            ? ` (${data.details})`
            : "";
        throw new Error(
          "error" in data ? `${data.error}${details}` : "Upload failed.",
        );
      }

      if ("chunkCount" in data) {
        setUploadMessage(
          `Uploaded successfully. ${data.chunkCount} chunk(s) indexed.`,
        );
      }
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmed = message.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setReply(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = (await res.json()) as
        | { reply: string }
        | { error: string; details?: string };

      if (!res.ok) {
        const details =
          "details" in data && data.details
            ? ` (${data.details})`
            : "";
        throw new Error(
          "error" in data ? `${data.error}${details}` : "Request failed.",
        );
      }

      setReply("reply" in data ? data.reply : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const canSend = message.trim().length > 0 && !loading;

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
      <main className="w-full max-w-2xl rounded-xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Tutor Chat (MVP)
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Ask a question and get a response from the AI tutor.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <label className="text-sm text-zinc-700 dark:text-zinc-300">
            PDF:
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="max-w-[min(100%,220px)] text-sm text-black file:mr-2 file:rounded-md file:border-0 file:bg-zinc-100 file:px-2 file:py-1 file:text-sm dark:text-zinc-50 dark:file:bg-zinc-800"
          />
          <button
            type="button"
            onClick={onUploadClick}
            disabled={uploading}
            className="h-9 rounded-lg border border-black/10 bg-white px-3 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
        {uploadMessage && (
          <p className="mt-2 text-sm text-green-700 dark:text-green-400">
            {uploadMessage}
          </p>
        )}
        {uploadError && (
          <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {uploadError}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your question…"
            className="h-11 flex-1 rounded-lg border border-black/10 bg-white px-3 text-sm text-black outline-none focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-white/20"
          />
          <button
            type="submit"
            disabled={!canSend}
            className="h-11 rounded-lg bg-black px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {loading ? "Sending…" : "Send"}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          {loading && (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              Thinking…
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {reply && (
            <div className="rounded-lg border border-black/10 bg-zinc-50 px-3 py-2 text-sm text-black dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-50">
              {reply}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
