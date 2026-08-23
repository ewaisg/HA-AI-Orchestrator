import { css } from "lit";

export const panelStyles = css`
  :host {
    --orchestrator-accent: var(--primary-color, #0c6b66);
    --orchestrator-accent-strong: #07514d;
    --orchestrator-accent-soft: #dff2ef;
    --orchestrator-surface: var(--card-background-color, #ffffff);
    --orchestrator-canvas: var(--primary-background-color, #f2f6f6);
    --orchestrator-text: var(--primary-text-color, #172126);
    --orchestrator-muted: var(--secondary-text-color, #526168);
    --orchestrator-border: var(--divider-color, #d7e0e0);
    --orchestrator-warning: #7a4a00;
    --orchestrator-warning-soft: #fff2d8;
    --orchestrator-error: var(--error-color, #b42318);
    --orchestrator-error-soft: #ffebe9;
    display: block;
    min-height: 100%;
    background: var(--orchestrator-canvas);
    color: var(--orchestrator-text);
    font-family: var(
      --paper-font-body1_-_font-family,
      Inter,
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif
    );
  }

  * {
    box-sizing: border-box;
  }

  button,
  a {
    font: inherit;
  }

  button:focus-visible,
  a:focus-visible {
    outline: 3px solid var(--orchestrator-accent);
    outline-offset: 3px;
  }

  .app-frame {
    min-height: 100vh;
    display: grid;
    grid-template-columns: minmax(232px, 272px) minmax(0, 1fr);
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 28px;
    padding: 24px 18px;
    border-right: 1px solid var(--orchestrator-border);
    background: var(--orchestrator-surface);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 8px;
  }

  .brand-mark {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 13px;
    background: var(--orchestrator-accent);
    color: #ffffff;
    font-weight: 800;
    letter-spacing: -0.04em;
  }

  .brand-copy {
    min-width: 0;
  }

  .brand-title {
    margin: 0;
    font-size: 1rem;
    line-height: 1.2;
    font-weight: 760;
  }

  .brand-subtitle {
    margin: 4px 0 0;
    color: var(--orchestrator-muted);
    font-size: 0.78rem;
  }

  .section-nav {
    display: grid;
    gap: 5px;
  }

  .nav-button {
    min-height: 44px;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border: 1px solid transparent;
    border-radius: 11px;
    background: transparent;
    color: var(--orchestrator-muted);
    cursor: pointer;
    text-align: left;
  }

  .nav-button:hover {
    border-color: var(--orchestrator-border);
    background: var(--orchestrator-canvas);
    color: var(--orchestrator-text);
  }

  .nav-button[aria-current="page"] {
    background: var(--orchestrator-accent-soft);
    color: var(--orchestrator-accent-strong);
    font-weight: 720;
  }

  .nav-marker {
    width: 9px;
    height: 9px;
    flex: 0 0 auto;
    border: 2px solid currentColor;
    border-radius: 50%;
  }

  .sidebar-note {
    margin-top: auto;
    padding: 14px;
    border: 1px solid var(--orchestrator-border);
    border-radius: 12px;
    color: var(--orchestrator-muted);
    font-size: 0.8rem;
    line-height: 1.5;
  }

  .sidebar-note strong {
    display: block;
    margin-bottom: 3px;
    color: var(--orchestrator-text);
  }

  .workspace {
    min-width: 0;
    padding: clamp(20px, 4vw, 48px);
  }

  .workspace-inner {
    width: min(1100px, 100%);
    margin: 0 auto;
  }

  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 28px;
  }

  .eyebrow {
    margin: 0 0 8px;
    color: var(--orchestrator-accent-strong);
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  h1,
  h2,
  h3,
  p {
    overflow-wrap: anywhere;
  }

  h1 {
    margin: 0;
    font-size: clamp(1.85rem, 4vw, 2.65rem);
    line-height: 1.08;
    letter-spacing: -0.035em;
  }

  .page-intro {
    max-width: 690px;
    margin: 12px 0 0;
    color: var(--orchestrator-muted);
    font-size: 1rem;
    line-height: 1.65;
  }

  .privacy-badge,
  .phase-badge,
  .state-pill {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 5px 10px;
    border: 1px solid var(--orchestrator-border);
    border-radius: 999px;
    background: var(--orchestrator-surface);
    color: var(--orchestrator-muted);
    font-size: 0.78rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .hero {
    position: relative;
    overflow: hidden;
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(240px, 0.6fr);
    gap: 28px;
    padding: clamp(24px, 4vw, 38px);
    border: 1px solid var(--orchestrator-border);
    border-radius: 22px;
    background: var(--orchestrator-surface);
    box-shadow: 0 18px 48px rgb(31 55 57 / 8%);
  }

  .hero::after {
    content: "";
    position: absolute;
    width: 220px;
    height: 220px;
    right: -85px;
    top: -100px;
    border-radius: 50%;
    background: var(--orchestrator-accent-soft);
    opacity: 0.7;
    pointer-events: none;
  }

  .hero-copy,
  .connection-summary {
    position: relative;
    z-index: 1;
  }

  .status-kicker {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 0 0 14px;
    color: var(--orchestrator-muted);
    font-size: 0.82rem;
    font-weight: 720;
  }

  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--orchestrator-muted);
    box-shadow: 0 0 0 5px color-mix(in srgb, var(--orchestrator-muted) 14%, transparent);
  }

  .status-dot.ready {
    background: #167451;
    box-shadow: 0 0 0 5px #dff3ea;
  }

  .status-dot.warning {
    background: var(--orchestrator-warning);
    box-shadow: 0 0 0 5px var(--orchestrator-warning-soft);
  }

  .status-dot.error {
    background: var(--orchestrator-error);
    box-shadow: 0 0 0 5px var(--orchestrator-error-soft);
  }

  .hero h2 {
    max-width: 620px;
    margin: 0;
    font-size: clamp(1.45rem, 3vw, 2rem);
    line-height: 1.2;
    letter-spacing: -0.025em;
  }

  .hero-description {
    max-width: 650px;
    margin: 13px 0 0;
    color: var(--orchestrator-muted);
    line-height: 1.65;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 24px;
  }

  .primary-button,
  .secondary-button {
    min-height: 44px;
    padding: 9px 16px;
    border-radius: 11px;
    cursor: pointer;
    font-weight: 740;
  }

  .primary-button {
    border: 1px solid var(--orchestrator-accent);
    background: var(--orchestrator-accent);
    color: #ffffff;
  }

  .primary-button:hover {
    background: var(--orchestrator-accent-strong);
  }

  .secondary-button {
    border: 1px solid var(--orchestrator-border);
    background: var(--orchestrator-surface);
    color: var(--orchestrator-text);
  }

  .secondary-button:hover {
    border-color: var(--orchestrator-accent);
    color: var(--orchestrator-accent-strong);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .connection-summary {
    align-self: stretch;
    padding: 20px;
    border: 1px solid var(--orchestrator-border);
    border-radius: 16px;
    background: var(--orchestrator-canvas);
  }

  .summary-label {
    margin: 0;
    color: var(--orchestrator-muted);
    font-size: 0.76rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .summary-value {
    margin: 9px 0 0;
    font-size: 1.05rem;
    font-weight: 780;
  }

  .summary-detail {
    margin: 7px 0 0;
    color: var(--orchestrator-muted);
    font-size: 0.86rem;
    line-height: 1.5;
  }

  .summary-rule {
    height: 1px;
    margin: 17px 0;
    background: var(--orchestrator-border);
  }

  .content-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
    margin-top: 20px;
  }

  .card {
    padding: 22px;
    border: 1px solid var(--orchestrator-border);
    border-radius: 17px;
    background: var(--orchestrator-surface);
  }

  .card h2,
  .card h3 {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.3;
  }

  .card-intro {
    margin: 7px 0 18px;
    color: var(--orchestrator-muted);
    font-size: 0.88rem;
    line-height: 1.5;
  }

  .status-list,
  .next-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .status-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 14px;
    align-items: center;
    padding: 12px 0;
    border-top: 1px solid var(--orchestrator-border);
  }

  .status-row:first-child {
    padding-top: 0;
    border-top: 0;
  }

  .status-row:last-child {
    padding-bottom: 0;
  }

  .status-name {
    display: block;
    font-weight: 700;
  }

  .status-detail {
    display: block;
    margin-top: 3px;
    color: var(--orchestrator-muted);
    font-size: 0.8rem;
  }

  .state-pill.available {
    border-color: #9fd6c0;
    background: #e5f5ed;
    color: #0e6040;
  }

  .state-pill.unavailable {
    border-color: var(--orchestrator-border);
    background: var(--orchestrator-canvas);
  }

  .next-list {
    counter-reset: steps;
  }

  .next-list li {
    position: relative;
    min-height: 38px;
    padding: 0 0 16px 42px;
    color: var(--orchestrator-muted);
    line-height: 1.5;
    counter-increment: steps;
  }

  .next-list li::before {
    content: counter(steps);
    position: absolute;
    left: 0;
    top: 0;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    background: var(--orchestrator-accent-soft);
    color: var(--orchestrator-accent-strong);
    font-size: 0.78rem;
    font-weight: 800;
  }

  .next-list li:last-child {
    padding-bottom: 0;
  }

  .next-list strong {
    display: block;
    color: var(--orchestrator-text);
  }

  .assurance {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    margin-top: 18px;
    padding: 15px 17px;
    border: 1px solid #a9d6d2;
    border-radius: 13px;
    background: var(--orchestrator-accent-soft);
    color: var(--orchestrator-accent-strong);
    font-size: 0.86rem;
    line-height: 1.55;
  }

  .assurance-mark {
    flex: 0 0 auto;
    font-weight: 900;
  }

  .placeholder {
    min-height: 360px;
    display: grid;
    place-items: center;
    padding: clamp(26px, 6vw, 72px);
    border: 1px solid var(--orchestrator-border);
    border-radius: 22px;
    background: var(--orchestrator-surface);
    text-align: center;
  }

  .placeholder-inner {
    max-width: 620px;
  }

  .placeholder h2 {
    margin: 18px 0 0;
    font-size: clamp(1.35rem, 3vw, 1.8rem);
  }

  .placeholder p {
    margin: 12px auto 0;
    color: var(--orchestrator-muted);
    line-height: 1.65;
  }

  .probe-actions {
    justify-content: center;
  }

  .probe-result {
    display: grid;
    gap: 5px;
    margin-top: 20px;
    padding: 14px 16px;
    border: 1px solid var(--orchestrator-border);
    border-radius: 12px;
    background: var(--orchestrator-canvas);
    color: var(--orchestrator-muted);
    font-size: 0.86rem;
    line-height: 1.5;
    text-align: left;
  }

  .probe-result strong {
    color: var(--orchestrator-text);
  }

  .loading-bar {
    width: 100%;
    max-width: 320px;
    height: 7px;
    margin-top: 24px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--orchestrator-border);
  }

  .loading-bar::after {
    content: "";
    display: block;
    width: 42%;
    height: 100%;
    border-radius: inherit;
    background: var(--orchestrator-accent);
    animation: loading 1.2s ease-in-out infinite alternate;
  }

  @keyframes loading {
    from {
      transform: translateX(-12%);
    }
    to {
      transform: translateX(150%);
    }
  }

  @media (max-width: 900px) {
    .app-frame,
    .app-frame.narrow {
      display: block;
    }

    .sidebar {
      gap: 16px;
      padding: 14px 16px;
      border-right: 0;
      border-bottom: 1px solid var(--orchestrator-border);
    }

    .brand {
      padding: 0;
    }

    .brand-mark {
      width: 38px;
      height: 38px;
    }

    .section-nav {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding: 2px 1px 6px;
      scrollbar-width: thin;
    }

    .nav-button {
      width: auto;
      flex: 0 0 auto;
      white-space: nowrap;
    }

    .sidebar-note {
      display: none;
    }

    .workspace {
      padding: 24px 16px 40px;
    }

    .hero {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  @media (max-width: 680px) {
    .page-header {
      display: block;
    }

    .privacy-badge {
      margin-top: 16px;
      white-space: normal;
    }

    .content-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .hero {
      padding: 23px 19px;
      border-radius: 17px;
    }

    .card {
      padding: 19px;
    }

    .status-row {
      grid-template-columns: minmax(0, 1fr);
      gap: 8px;
    }

    .state-pill {
      justify-self: start;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      scroll-behavior: auto !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  @media (forced-colors: active) {
    .brand-mark,
    .primary-button,
    .status-dot,
    .next-list li::before {
      forced-color-adjust: none;
    }

    .nav-button[aria-current="page"] {
      outline: 2px solid CanvasText;
    }
  }
`;
