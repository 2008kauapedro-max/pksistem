/* Funções auxiliares: datas, moeda, WhatsApp, validação de imagens etc. */

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ---------- Datas ---------- */

export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatDateLong(iso: string): string {
  const d = parseISO(iso);
  const s = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDateShort(iso: string): string {
  const d = parseISO(iso);
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
}

export function formatDateTime(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return "—";
  const today = todayISO();
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const yISO = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, "0")}-${String(
    yest.getDate(),
  ).padStart(2, "0")}`;
  const hh = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const isoDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (isoDay === today) return `Hoje · ${hh}`;
  if (isoDay === yISO) return `Ontem · ${hh}`;
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · ${hh}`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/* ---------- Moeda ---------- */

export function formatBRL(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return "";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parsePrice(raw: string): number | null {
  if (!raw.trim()) return null;
  const n = Number(raw.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/* ---------- Telefone / WhatsApp ---------- */

export function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

export function waLink(phone: string, text: string): string {
  const digits = onlyDigits(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export interface MarmitaIntent {
  size: string;
  protein: string;
  sides: string[];
  observation?: string;
  customerName?: string;
}

export function buildMarmitaMessage(i: MarmitaIntent): string {
  const who = i.customerName?.trim() ? `\n\nNome: ${i.customerName.trim()}` : "";
  const obs = i.observation?.trim() ? `\n\nObservação:\n${i.observation.trim()}` : "";
  return [
    `Olá! Gostaria de pedir uma marmita. 🍱`,
    ``,
    `Tamanho: ${i.size}`,
    ``,
    `Proteína: ${i.protein}`,
    ``,
    `Acompanhamentos:`,
    ...(i.sides.length ? i.sides.map((s) => `• ${s}`) : [`• (nenhum)`]),
    obs,
    who,
  ].join("\n");
}

/* ---------- Slug ---------- */

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function isValidSlug(s: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
}

/* ---------- Imagens ---------- */

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_MB = 4;

export function validateImageFile(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) {
    return "Formato inválido. Envie uma imagem JPG, PNG ou WEBP.";
  }
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    return `Imagem muito grande. O limite é ${MAX_IMAGE_MB} MB.`;
  }
  return null;
}

/** Redimensiona (máx. 900px) e converte para JPEG — mantém o banco leve. */
export function fileToDataUrl(file: File, maxDim = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("canvas");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        reject(new Error("Não foi possível processar a imagem."));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem. Tente outro arquivo."));
    };
    img.src = url;
  });
}

/* ---------- Status de pedido ---------- */

export type OrderStatus = "pendente" | "preparando" | "pronta" | "entregue";

export const ORDER_FLOW: OrderStatus[] = ["pendente", "preparando", "pronta", "entregue"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pendente: "Pendente",
  preparando: "Preparando",
  pronta: "Pronta",
  entregue: "Entregue",
};

export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pendente: "preparando",
  preparando: "pronta",
  pronta: "entregue",
};

export const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pendente: "Iniciar preparo",
  preparando: "Marcar pronta",
  pronta: "Marcar entregue",
};
