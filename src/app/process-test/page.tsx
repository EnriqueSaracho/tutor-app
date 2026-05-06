"use client";

export default function ProcessTestPage() {
  async function handleClick() {
    const res = await fetch("/api/process-document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: "5300c7c2-48ab-4f38-8904-5d536cb616f5",
      }),
    });
    const data = await res.json().catch(() => null);
    console.log("process-document response:", res.status, data);
  }

  return (
    <div>
      <button type="button" onClick={handleClick}>
        Process Document
      </button>
      <p>Check console for result</p>
    </div>
  );
}
