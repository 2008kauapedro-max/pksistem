/* Ícones SVG próprios — traço consistente (1.8), desenhados para o produto. */
import type { SVGProps } from "react";

export type IconName =
  | "logo"
  | "dashboard"
  | "menuBook"
  | "book"
  | "lunchbox"
  | "users"
  | "palette"
  | "gear"
  | "logout"
  | "plus"
  | "search"
  | "check"
  | "x"
  | "chevronDown"
  | "chevronRight"
  | "arrowLeft"
  | "arrowRight"
  | "eye"
  | "eyeOff"
  | "whatsapp"
  | "instagram"
  | "clock"
  | "pin"
  | "phone"
  | "trash"
  | "camera"
  | "image"
  | "alert"
  | "info"
  | "calendar"
  | "refresh"
  | "external"
  | "flame"
  | "inbox"
  | "card"
  | "steam"
  | "shield"
  | "globe"
  | "crown"
  | "bell"
  | "chart"
  | "copy"
  | "download"
  | "zap"
  | "building"
  | "creditCard"
  | "moon"
  | "sun"
  | "star"
  | "lock"
  | "send"
  | "rocket"
  | "layers"
  | "trend";

const PATHS: Record<IconName, React.ReactNode> = {
  logo: (
    <>
      <circle cx="12" cy="13.5" r="7.2" />
      <circle cx="12" cy="13.5" r="3.1" fill="currentColor" stroke="none" />
      <path d="M8.6 3.4c.9-1.2 2-1.2 2.9 0M13 3.4c.9-1.2 2-1.2 2.9 0" strokeLinecap="round" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="4.6" rx="1.6" />
      <rect x="13.5" y="11.1" width="7" height="9.4" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
    </>
  ),
  menuBook: (
    <>
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3h11A1.5 1.5 0 0 1 19 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-15Z" />
      <path d="M8.5 7.5h7M8.5 11h7M8.5 14.5h4.5" strokeLinecap="round" />
    </>
  ),
  book: (
    <>
      <path d="M4.5 5.5A2 2 0 0 1 6.5 3.5H19v15H6.7a2.2 2.2 0 0 0 0 4.4H19" />
      <path d="M4.5 5.5v13.2" strokeLinecap="round" />
      <path d="M9 8h6.5M9 11.2H13" strokeLinecap="round" />
    </>
  ),
  lunchbox: (
    <>
      <rect x="3.5" y="8" width="17" height="11" rx="2.4" />
      <path d="M3.5 12.2h17M12 8v11" />
      <path d="M8.5 8V6.6A1.6 1.6 0 0 1 10.1 5h3.8a1.6 1.6 0 0 1 1.6 1.6V8" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.2" r="3.4" />
      <path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" strokeLinecap="round" />
      <path d="M15.5 5.4a3.4 3.4 0 0 1 0 5.7M17.6 14.9c1.6.8 2.6 2.4 2.9 4.6" strokeLinecap="round" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-.8 2-1.7 0-.8-.5-1.2-.5-2 0-1 .8-1.8 2-1.8h1.8c1.8 0 3.2-1.3 3.2-3.2A8.6 8.6 0 0 0 12 3.5Z" />
      <circle cx="8" cy="9.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12.2" cy="7.2" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="16.2" cy="9.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="7.6" cy="14" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.4v2.1M12 18.5v2.1M3.4 12h2.1M18.5 12h2.1M6 6l1.5 1.5M16.5 16.5 18 18M18 6l-1.5 1.5M7.5 16.5 6 18" strokeLinecap="round" />
    </>
  ),
  logout: (
    <>
      <path d="M14.5 4H7.2A1.7 1.7 0 0 0 5.5 5.7v12.6A1.7 1.7 0 0 0 7.2 20h7.3" strokeLinecap="round" />
      <path d="M10.5 12h9M16.5 8.5 20 12l-3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" strokeLinecap="round" />,
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m15.5 15.5 4.5 4.5" strokeLinecap="round" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />,
  x: <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />,
  chevronDown: <path d="m6 9.5 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />,
  arrowLeft: <path d="M20 12H4m6-6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />,
  arrowRight: <path d="M4 12h16m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />,
  eye: (
    <>
      <path d="M3 12s3.3-6 9-6 9 6 9 6-3.3 6-9 6-9-6-9-6Z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M5 5.5 19 19M9.9 9.8a2.9 2.9 0 0 0 4.1 4.1" strokeLinecap="round" />
      <path d="M6.6 7.2C4.3 8.7 3 12 3 12s3.3 6 9 6c1.7 0 3.2-.5 4.4-1.3M10 6.2c.6-.1 1.3-.2 2-.2 5.7 0 9 6 9 6s-.9 1.7-2.6 3.3" strokeLinecap="round" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M12 3.6a8.4 8.4 0 0 0-7.2 12.7L3.6 20.4l4.2-1.1A8.4 8.4 0 1 0 12 3.6Z" strokeLinejoin="round" />
      <path d="M8.8 8.8c-.5 1.6.7 3.7 2.3 5 1.4 1.2 3.2 1.9 4.1 1.4.5-.3.8-1 .6-1.5l-1.5-.8-.9.7c-.9-.4-1.9-1.4-2.3-2.3l.7-.9-.8-1.5c-.5-.4-1.7-.6-2.2-.1Z" strokeLinejoin="round" />
    </>
  ),
  instagram: (
    <>
      <rect x="3.8" y="3.8" width="16.4" height="16.4" rx="4.4" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.1" cy="6.9" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.4V12l3 2.2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.8-5.4-6.8-10.4a6.8 6.8 0 0 1 13.6 0C18.8 15.6 12 21 12 21Z" strokeLinejoin="round" />
      <circle cx="12" cy="10.4" r="2.5" />
    </>
  ),
  phone: (
    <path
      d="M6.8 4.2 8.9 7c.4.6.3 1.3-.2 1.8L7.5 10a12.4 12.4 0 0 0 6.5 6.5l1.2-1.2c.5-.5 1.2-.6 1.8-.2l2.8 2.1c.6.4.7 1.3.2 1.8l-1.4 1.4c-.8.8-2 1-3.1.6A17.8 17.8 0 0 1 5.4 10.9c-.4-1.1-.2-2.3.6-3.1l.8-.8c.5-.5 1.4-.4 1.8.2Z"
      strokeLinejoin="round"
    />
  ),
  trash: (
    <>
      <path d="M5 7h14M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" strokeLinecap="round" />
      <path d="M6.5 7l.8 12a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.8-12" strokeLinecap="round" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.2A1.7 1.7 0 0 1 5.7 6.5h2l1.5-2h5.6l1.5 2h2A1.7 1.7 0 0 1 20 8.2v9.1a1.7 1.7 0 0 1-1.7 1.7H5.7A1.7 1.7 0 0 1 4 17.3V8.2Z" strokeLinejoin="round" />
      <circle cx="12" cy="12.4" r="3.4" />
    </>
  ),
  image: (
    <>
      <rect x="3.8" y="4.8" width="16.4" height="14.4" rx="2" />
      <circle cx="9" cy="10" r="1.7" />
      <path d="m4.5 17.5 4.6-4.4a1.3 1.3 0 0 1 1.8 0l2.4 2.3 2.2-2a1.3 1.3 0 0 1 1.7 0l2.8 2.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4 2.9 19.2a1 1 0 0 0 .9 1.5h16.4a1 1 0 0 0 .9-1.5L12 4Z" strokeLinejoin="round" />
      <path d="M12 9.8v4.4" strokeLinecap="round" />
      <circle cx="12" cy="17.2" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 11.2v5" strokeLinecap="round" />
      <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.8" y="5.2" width="16.4" height="15" rx="2" />
      <path d="M3.8 9.6h16.4M8.2 3.4v3.4M15.8 3.4v3.4" strokeLinecap="round" />
      <path d="M7.8 13h2.4M10.8 13h2.4M13.8 13h2.4M7.8 16.4h2.4M10.8 16.4h2.4" strokeLinecap="round" />
    </>
  ),
  refresh: (
    <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 3.8v3.4h-3.4" strokeLinecap="round" strokeLinejoin="round" />
  ),
  external: (
    <>
      <path d="M10 5H6.2A1.7 1.7 0 0 0 4.5 6.7v11.1a1.7 1.7 0 0 0 1.7 1.7h11.1a1.7 1.7 0 0 0 1.7-1.7V14" strokeLinecap="round" />
      <path d="M13.5 4.5H19.5V10.5M19 5 11.5 12.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  flame: (
    <path
      d="M12 21c3.9 0 6.5-2.6 6.5-6.2 0-2.5-1.4-4.4-2.8-6C14.3 7.1 13 5.5 13 3.5c-2.8 1.5-4 4-3.6 6.3-.9-.3-1.6-1-1.9-2.2-1.3 1.4-2 3.3-2 5.2C5.5 18.4 8.1 21 12 21Z"
      strokeLinejoin="round"
    />
  ),
  inbox: (
    <>
      <path d="M4 13.5 6.2 5.9A1.6 1.6 0 0 1 7.7 4.8h8.6a1.6 1.6 0 0 1 1.5 1.1L20 13.5v4.2a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 17.7v-4.2Z" strokeLinejoin="round" />
      <path d="M4 13.5h4.5l1.2 2h4.6l1.2-2H20" strokeLinejoin="round" />
    </>
  ),
  card: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M3.5 9.7h17M7 14.6h4" strokeLinecap="round" />
    </>
  ),
  steam: (
    <path d="M7 20c2.5-1.2 2.5-3 0-4.5S4.5 12 7 10.5M12 20c2.5-1.2 2.5-3 0-4.5S9.5 12 12 10.5M17 20c2.5-1.2 2.5-3 0-4.5s-2.5-3.5 0-5" strokeLinecap="round" />
  ),
  shield: (
    <>
      <path d="M12 3.5 5 6.2v5.4c0 4.4 2.9 7.4 7 8.9 4.1-1.5 7-4.5 7-8.9V6.2L12 3.5Z" strokeLinejoin="round" />
      <path d="m8.8 11.8 2.3 2.3 4.1-4.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M3.6 12h16.8M12 3.6c-4.8 4.6-4.8 12.2 0 16.8 4.8-4.6 4.8-12.2 0-16.8Z" />
    </>
  ),
  crown: (
    <>
      <path d="M4.5 8.5 8 11.5l4-5.5 4 5.5 3.5-3-1.2 9a1.6 1.6 0 0 1-1.6 1.4H7.3a1.6 1.6 0 0 1-1.6-1.4l-1.2-9Z" strokeLinejoin="round" />
      <path d="M8.5 15.5h7" strokeLinecap="round" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16.5v-5a6 6 0 1 1 12 0v5l1.6 2.4H4.4L6 16.5Z" strokeLinejoin="round" />
      <path d="M9.8 21a2.3 2.3 0 0 0 4.4 0" strokeLinecap="round" />
    </>
  ),
  chart: (
    <>
      <path d="M4 4v15.2a.8.8 0 0 0 .8.8H20" strokeLinecap="round" />
      <path d="M8 15.5v-3M12.5 15.5V8M17 15.5v-5.2" strokeLinecap="round" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M5.5 15.5h-.7a1.8 1.8 0 0 1-1.8-1.8V5.3a1.8 1.8 0 0 1 1.8-1.8h8.4a1.8 1.8 0 0 1 1.8 1.8v.7" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v10.5M7.8 10.8l4.2 4.2 4.2-4.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 16.5v1.7a1.8 1.8 0 0 0 1.8 1.8h11.4a1.8 1.8 0 0 0 1.8-1.8v-1.7" strokeLinecap="round" />
    </>
  ),
  zap: <path d="M13 3 5 13.2h5.4L10.5 21l8-10.2h-5.4L13 3Z" strokeLinejoin="round" />,
  building: (
    <>
      <rect x="4.5" y="4" width="10" height="16.5" rx="1.4" />
      <path d="M14.5 9.5h3.6a1.4 1.4 0 0 1 1.4 1.4v9.6h-5M8 8h3M8 11.5h3M8 15h3M9.5 20.5v-2.6" strokeLinecap="round" />
    </>
  ),
  creditCard: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.2" />
      <path d="M3.5 9.8h17M7 14.8h4.5" strokeLinecap="round" />
    </>
  ),
  moon: <path d="M19.5 14.2A7.8 7.8 0 0 1 9.8 4.5a7.8 7.8 0 1 0 9.7 9.7Z" strokeLinejoin="round" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1.8M12 19.2V21M3 12h1.8M19.2 12H21M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M18.4 5.6l-1.3 1.3M6.9 17.1l-1.3 1.3" strokeLinecap="round" />
    </>
  ),
  star: <path d="m12 3.8 2.4 5 5.5.7-4 3.8 1 5.4L12 16.1l-4.9 2.6 1-5.4-4-3.8 5.5-.7 2.4-5Z" strokeLinejoin="round" />,
  lock: (
    <>
      <rect x="5.5" y="10.5" width="13" height="9.5" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14.5v2" strokeLinecap="round" />
    </>
  ),
  send: <path d="M20 4.5 10 14.5M20 4.5 13.5 20l-3.5-5.5L4.5 11 20 4.5Z" strokeLinejoin="round" />,
  rocket: (
    <>
      <path d="M12 15.5c5.5-3.5 7.5-8 7.5-11.5-3.5 0-8 2-11.5 7.5l-3.5 1 3 3 1-3.5" strokeLinejoin="round" />
      <path d="M9 15.5c-1.5.5-2.5 2-3 4.5 2.5-.5 4-1.5 4.5-3M14.5 8.5a1 1 0 1 0 .01 0Z" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3.5 8.5 4.5L12 12.5 3.5 8 12 3.5Z" strokeLinejoin="round" />
      <path d="m4.5 12.5 7.5 4 7.5-4M4.5 16.5l7.5 4 7.5-4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  trend: (
    <>
      <path d="m3.5 16.5 5.5-5.5 3.5 3.5 7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 7h5v5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function I({ name, size = 20, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

/** Marca do produto: prato com vapor. */
export function BrandMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
      <rect width="48" height="48" rx="13" fill="currentColor" opacity="0.12" />
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <circle cx="24" cy="27" r="11.5" />
        <circle cx="24" cy="27" r="5" fill="currentColor" stroke="none" />
        <path d="M18.5 9.5c1.4-1.9 3.2-1.9 4.6 0M25.5 9.5c1.4-1.9 3.2-1.9 4.6 0" />
      </g>
    </svg>
  );
}
