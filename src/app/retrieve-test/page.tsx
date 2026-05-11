"use client";

import { useCallback, useState } from "react";

const DOCUMENT_ID = "5300c7c2-48ab-4f38-8904-5d536cb616f5";

type RetrieveResult = {
  content: string;
  similarity: number;
};

export default function RetrieveTestPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RetrieveResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch("/api/retrieve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          documentId: DOCUMENT_ID,
          topK: 3,
        }),
      });

      const data = await res.json().catch(() => null);
      console.log("retrieve response:", res.status, data);

      if (!res.ok) {
        const msg =
          typeof data?.error === "string"
            ? data.error
            : data?.details ?? `HTTP ${res.status}`;
        setError(msg);
        return;
      }

      if (data?.success && Array.isArray(data.results)) {
        setResults(data.results as RetrieveResult[]);
      } else {
        setResults([]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      setError(msg);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <div style={{ padding: "1rem", maxWidth: "42rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question..."
          style={{ flex: "1 1 12rem", minWidth: "12rem" }}
        />
        <button type="button" onClick={handleSearch} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && (
        <p style={{ color: "crimson", marginTop: "1rem" }}>{error}</p>
      )}

      <ul style={{ marginTop: "1rem", paddingLeft: "1.25rem" }}>
        {results.map((r, i) => (
          <li key={i} style={{ marginBottom: "1rem" }}>
            <div>
              <strong>Similarity:</strong> {r.similarity.toFixed(4)}
            </div>
            <div style={{ whiteSpace: "pre-wrap", marginTop: "0.25rem" }}>
              {r.content}
            </div>
          </li>
        ))}
      </ul>

      {results.length === 0 && !error && !loading && (
        <p style={{ marginTop: "1rem", opacity: 0.7 }}>
          Enter a query and click Search.
        </p>
      )}
    </div>
  );
}
