import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { applyStoredTheme } from "./lib/theme";

applyStoredTheme();

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.textContent = "HITR failed to boot: missing #root.";
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
