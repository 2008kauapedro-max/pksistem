import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { supabase } from './lib/supabase';

// Força o site a reconhecer o login
supabase?.auth.getSession().then(({ data: { session } }) => {
  if (session && window.location.pathname === '/cadastro') {
    window.location.href = '/app';
  }
});

supabase?.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    window.location.href = '/app';
  }
});
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

/* PWA: registra o service worker para permitir instalação do app. */
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* PWA é progressivo — falha silenciosa não quebra o app */
    });
  });
}
