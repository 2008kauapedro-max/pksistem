import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Renderiza o app (sem redirecionamentos forçados que causam loop)
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

/* PWA: registra o service worker para permitir instalação do app. */
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {
      /* PWA é progressivo — falha silenciosa não quebra o app */
    });
  });
}