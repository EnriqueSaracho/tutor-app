"use client";

import { useEffect } from "react";

import { supabase } from "@/lib/supabase";

export default function TestPage() {
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("documents")
        .insert({ title: "Test Document", file_path: "test/path.pdf" })
        .select();

      console.log({ data, error });
    })();
  }, []);

  return <div>Check console</div>;
}

