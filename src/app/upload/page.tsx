"use client";

import { useCallback } from "react";

import { supabase } from "@/lib/supabase";

export default function UploadPage() {
  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const timestamp = Date.now();
      const safeName = file.name.replaceAll("/", "_");
      const storagePath = `uploads/${timestamp}-${safeName}`;

      const uploadResult = await supabase.storage
        .from("documents")
        .upload(storagePath, file, {
          upsert: false,
          contentType: file.type || "application/pdf",
        });

      console.log("storage upload:", uploadResult);

      if (uploadResult.error) return;

      const insertResult = await supabase
        .from("documents")
        .insert({ title: file.name, file_path: storagePath })
        .select();

      console.log("documents insert:", insertResult);
    },
    [],
  );

  return (
    <div>
      <input
        type="file"
        accept="application/pdf,.pdf"
        onChange={onFileChange}
      />
      <p>Check console</p>
    </div>
  );
}
