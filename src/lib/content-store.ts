import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Service = { id?: string; name: string; price: number; img: string; desc: string };
export type Content = { makeup: Service[]; hair: Service[] };

export const emptyContent: Content = { makeup: [], hair: [] };

function rowToSvc(r: { id: string; name: string; price: number; img: string; description: string }): Service {
  return { id: r.id, name: r.name, price: Number(r.price), img: r.img, desc: r.description };
}

export async function fetchContent(): Promise<Content> {
  const { data, error } = await supabase
    .from("services")
    .select("id,category,name,price,img,description,sort_order")
    .order("sort_order", { ascending: true });
  if (error || !data) return emptyContent;
  return {
    makeup: data.filter((d) => d.category === "makeup").map(rowToSvc),
    hair: data.filter((d) => d.category === "hair").map(rowToSvc),
  };
}

export function useContent(): Content {
  const [content, setContent] = useState<Content>(emptyContent);

  useEffect(() => {
    let alive = true;
    fetchContent().then((c) => { if (alive) setContent(c); });

    const channel = supabase
      .channel("services-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "services" }, () => {
        fetchContent().then((c) => { if (alive) setContent(c); });
      })
      .subscribe();

    return () => { alive = false; supabase.removeChannel(channel); };
  }, []);

  return content;
}
