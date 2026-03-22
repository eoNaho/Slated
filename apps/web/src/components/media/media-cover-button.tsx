"use client";

import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface MediaCoverButtonProps {
  mediaId: string;
}

export function MediaCoverButton({ mediaId }: MediaCoverButtonProps) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("cover", file);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1"}/media/${mediaId}/custom-cover`,
        { method: "POST", body: formData, credentials: "include" }
      );
      if (!res.ok) {
        const err = await res.json();
        toast.error(
          err.error?.includes("Pro") || err.error?.includes("Ultra")
            ? "Capas customizadas requerem plano Pro ou Ultra"
            : "Erro ao enviar capa"
        );
      } else {
        toast.success("Capa personalizada salva!");
        queryClient.invalidateQueries({ queryKey: ["media", mediaId, "state"] });
      }
    } catch {
      toast.error("Erro ao enviar capa");
    } finally {
      setUploading(false);
    }
  };

  return (
    <label
      title="Trocar capa personalizada"
      className={`absolute bottom-2 right-2 z-10 w-8 h-8 rounded-lg bg-black/70 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/90 hover:border-white/30 transition-all cursor-pointer opacity-0 group-hover:opacity-100 ${uploading ? "pointer-events-none" : ""}`}
    >
      {uploading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Camera className="h-3.5 w-3.5" />
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </label>
  );
}
