"use strict";

const PAGE_META = {
  dashboard: ["Dashboard", "Treasury overview"],
  "cash-flow": ["Cash Flow", "Forecast workspace"],
  investments: ["Investments", "Surplus cash"],
  transactions: ["Transactions", "Activity ledger"],
  reports: ["Reports", "Monthly reporting"],
  integrations: ["Integrations", "Data connections"],
  settings: ["Settings", "Demo preferences"],
  profile: ["Profile", "User and business settings"]
};

const state = {
  data: null,
  compliance: "Shariah",
  reserve: 220000,
  currentReport: 0,
  forecastRange: 30,
  userEmail: "",
  profile: null,
  isLoggingIn: false,
  loginTimer: null,
  toastTimer: null
};

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const rm = (value, signed = false) => {
  const amount = Number(value) || 0;
  const prefix = signed && amount > 0 ? "+" : amount < 0 ? "−" : "";
  return `${prefix}RM${Math.abs(amount).toLocaleString("en-MY", { maximumFractionDigits: 0 })}`;
};
const percent = (value) => `${Number(value).toFixed(2)}%`;
const initials = (email) => (email || "Demo User").split(/[@.\s_-]/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "DU";

document.addEventListener("DOMContentLoaded", () => {
  bindStaticEvents();
  const session = readSession();
  if (session) {
    state.compliance = session.compliance || "Shariah";
    showApplication(session.email);
  }
});

function bindStaticEvents() {
  $("#login-form").addEventListener("submit", handleLogin);
  $("#email").addEventListener("blur", () => {
    $("#email").value = $("#email").value.trim();
    validateEmail(true);
  });
  $("#email").addEventListener("input", () => {
    if ($("#email").getAttribute("aria-invalid") === "true" || isValidEmail($("#email").value.trim())) validateEmail(false);
  });
  $("#password").addEventListener("input", () => {
    if ($("#password").value.trim()) setFieldError($("#password"), $("#password-error"), "");
  });
  $("#logout-button").addEventListener("click", logout);
  $("#demo-info-button").addEventListener("click", () => showToast("Demo data", "All balances, forecasts, transactions and recommendations in this workspace are fictional and simulated."));
  $("#retry-button").addEventListener("click", loadDashboard);
  $("#menu-button").addEventListener("click", openSidebar);
  $("#sidebar-close").addEventListener("click", closeSidebar);
  $("#sidebar-scrim").addEventListener("click", closeSidebar);
  window.addEventListener("hashchange", routeFromHash);

  $("#forecast-range").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-range]");
    if (!button) return;
    state.forecastRange = Number(button.dataset.range);
    $$("button", $("#forecast-range")).forEach((item) => item.classList.toggle("active", item === button));
    renderCashFlow();
  });

  $("#transaction-search").addEventListener("input", renderTransactions);
  $("#type-filter").addEventListener("change", renderTransactions);
  $("#status-filter").addEventListener("change", renderTransactions);
  $("#clear-filters").addEventListener("click", () => {
    $("#transaction-search").value = "";
    $("#type-filter").value = "All";
    $("#status-filter").value = "All";
    renderTransactions();
  });

  $("#reserve-input").addEventListener("input", updateReserveImpact);
  $("#settings-form").addEventListener("submit", saveSettings);
  $("#profile-form").addEventListener("submit", saveProfile);
  $("#change-preference").addEventListener("click", toggleCompliance);
  $("#export-report").addEventListener("click", exportReport);

  $("#toast-close").addEventListener("click", hideToast);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSidebar();
    }
  });
}

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem("tunaiPintarDemoSession"));
  } catch (_error) {
    return null;
  }
}

function setFieldError(input, errorElement, message) {
  input.classList.toggle("invalid", Boolean(message));
  input.setAttribute("aria-invalid", message ? "true" : "false");
  errorElement.textContent = message;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !value.includes(" ");
}

function validateEmail(showError = true) {
  const input = $("#email");
  const value = input.value.trim();
  const valid = isValidEmail(value) && input.validity.valid;
  if (valid) setFieldError(input, $("#email-error"), "");
  else if (showError) setFieldError(input, $("#email-error"), "Enter a valid work email address.");
  return valid;
}

function resetLoginButton() {
  state.isLoggingIn = false;
  const button = $("#login-submit");
  button.disabled = false;
  button.classList.remove("is-loading");
  button.removeAttribute("aria-busy");
  $(".button-label", button).textContent = "Continue to workspace";
}

function handleLogin(event) {
  event.preventDefault();
  if (state.isLoggingIn) return;
  const emailInput = $("#email");
  const passwordInput = $("#password");
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  emailInput.value = email;
  const emailValid = validateEmail(true);
  let passwordValid = true;

  if (!password) {
    setFieldError(passwordInput, $("#password-error"), "Enter a password to continue.");
    passwordValid = false;
  } else {
    setFieldError(passwordInput, $("#password-error"), "");
  }
  if (!emailValid || !passwordValid) {
    (!emailValid ? emailInput : passwordInput).focus();
    return;
  }

  state.compliance = $("input[name='compliance']:checked").value;
  const session = { email, compliance: state.compliance };
  state.isLoggingIn = true;
  const button = $("#login-submit");
  button.disabled = true;
  button.classList.add("is-loading");
  button.setAttribute("aria-busy", "true");
  $(".button-label", button).textContent = "Preparing workspace";
  state.loginTimer = window.setTimeout(() => {
    sessionStorage.setItem("tunaiPintarDemoSession", JSON.stringify(session));
    showApplication(email);
    resetLoginButton();
    state.loginTimer = null;
  }, 420);
}

function showApplication(email) {
  state.userEmail = email;
  if (!state.profile) {
    const localName = email.split("@")[0].split(/[._-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
    state.profile = { name: localName || "Demo Finance User", role: "Finance manager", email };
  }
  $("#login-screen").hidden = true;
  $("#app").hidden = false;
  $("#user-avatar").textContent = initials(email);
  document.title = "Dashboard — TunaiPintar Demo";
  loadDashboard();
}

function logout() {
  if (state.loginTimer) window.clearTimeout(state.loginTimer);
  state.loginTimer = null;
  resetLoginButton();
  sessionStorage.removeItem("tunaiPintarDemoSession");
  state.data = null;
  state.userEmail = "";
  state.profile = null;
  window.location.hash = "";
  $("#app").hidden = true;
  $("#login-screen").hidden = false;
  $("#password").value = "";
  document.title = "TunaiPintar — SME Treasury Demo";
  closeSidebar();
  $("#email").focus();
}

async function loadDashboard() {
  $("#loading-state").hidden = false;
  $("#error-state").hidden = true;
  $("#workspace").hidden = true;
  try {
    const response = await fetch("/api/dashboard", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`The demo API returned status ${response.status}.`);
    const data = await response.json();
    if (!data.meta || !data.balances || !Array.isArray(data.transactions)) throw new Error("The demo response is missing required fields.");
    state.data = data;
    state.reserve = data.settings.minimum_reserve;
    $("#as-of").textContent = `As of ${data.meta.as_of}`;
    renderAll();
    $("#loading-state").hidden = true;
    $("#workspace").hidden = false;
    routeFromHash();
  } catch (error) {
    $("#loading-state").hidden = true;
    $("#error-state").hidden = false;
    $("#error-message").textContent = `${error.message} Check that the Flask server is running and backend/demo_data.json is valid, then try again.`;
  }
}

function renderAll() {
  renderDashboard();
  renderCashFlow();
  renderInvestments();
  renderTransactions();
  renderReports();
  renderIntegrations();
  renderSettings();
  renderProfile();
}

function routeFromHash() {
  if ($("#app").hidden || !state.data) return;
  const requested = window.location.hash.replace("#", "") || "dashboard";
  const view = requested === "obligations" ? "cash-flow" : PAGE_META[requested] ? requested : "dashboard";
  $$("[data-view-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.viewPanel === view));
  $$(".sidebar-nav [data-view]").forEach((link) => {
    const active = link.dataset.view === view;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
  });
  $("#user-avatar").classList.toggle("active", view === "profile");
  if (view === "profile") $("#user-avatar").setAttribute("aria-current", "page");
  else $("#user-avatar").removeAttribute("aria-current");
  $("#page-title").textContent = PAGE_META[view][0];
  $("#page-kicker").textContent = PAGE_META[view][1];
  document.title = `${PAGE_META[view][0]} — TunaiPintar Demo`;
  closeSidebar();
  if (requested === "obligations") requestAnimationFrame(() => $("#obligations-panel").scrollIntoView({ block: "start" }));
  else window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderDashboard() {
  renderKpis();
  const data = state.data;
  const points = getAdjustedCashFlowPoints().slice(0, 8);
  const forecastLow = Math.min(...points.filter((point) => point.kind === "forecast").map((point) => point.value));
  $("#dashboard-chart").innerHTML = buildLineChart(points, "dashboard-gradient", state.reserve, 245);
  $("#dashboard-chart-footer").innerHTML = `<span>Forecast low <strong>${rm(forecastLow)}</strong></span><span>Minimum reserve <strong>${rm(state.reserve)}</strong></span><span>Confidence <strong>${data.cash_flow.confidence}</strong></span>`;

  $("#dashboard-insight").innerHTML = `
    <div class="insight-head"><span class="ai-label">Portfolio snapshot · Simulated</span><a class="ai-orb" href="#investments" aria-label="View the investment portfolio" title="View portfolio">◇</a></div>
    <h3>${data.investment.fund_name}</h3>
    <p>Review the fictional money market holding, its composition, indicative return and liquidity information in the dedicated portfolio view.</p>
    <div class="insight-metric"><span>Invested balance<br><strong>${rm(data.investment.invested_balance)}</strong></span><span>Indicative return<br><strong>${percent(data.investment.indicative_return_pa)} p.a.</strong></span><span>Liquidity<br><strong>T+1</strong></span></div>`;

  $("#upcoming-mini").innerHTML = getUpcomingExpenses().slice(0, 3).map((expense) => `
    <div class="list-item"><span class="list-icon">${expense.date.split(" ")[0]}</span><div class="list-copy"><strong>${expense.payee}</strong><small>${expense.date} · ${expense.category}</small></div><span class="list-amount">${rm(expense.amount)}</span></div>`).join("");
  $("#recent-transactions").innerHTML = data.transactions.slice(0, 3).map((transaction) => `
    <div class="list-item"><span class="list-icon">${transaction.type === "Inflow" ? "↓" : transaction.type === "Outflow" ? "↑" : "◇"}</span><div class="list-copy"><strong>${transaction.description}</strong><small>${transaction.date} · ${transaction.status}</small></div><span class="list-amount ${transaction.amount > 0 ? "positive" : ""}">${rm(transaction.amount, true)}</span></div>`).join("");
}

function renderKpis() {
  const balances = state.data.balances;
  const cards = [
    ["Total business cash", balances.total_business_cash, "Across two demo bank accounts", "RM", "+8.4% this month", "#cash-flow"],
    ["Protected reserve", state.reserve, "Liquidity floor that is not invested", "▣", "Guardrail active", "#settings"],
    ["Est. monthly return", state.data.investment.estimated_return_month, "Indicative portfolio estimate", "↗", "Not guaranteed", "#investments"],
    ["Invested balance", balances.invested_balance, "Fictional money market holding", "◇", "Indicative return only", "#investments"]
  ];
  $("#kpi-grid").innerHTML = cards.map(([label, value, note, icon, tag, href]) => `
    <a class="card kpi-card interactive-card" href="${href}" aria-label="View ${label.toLowerCase()}"><div class="kpi-top"><span class="kpi-icon" aria-hidden="true">${icon}</span><span class="kpi-tag">${tag}</span></div><p>${label}</p><strong>${rm(value)}</strong><small>${note} · Demo data</small><span class="card-route" aria-hidden="true">View details →</span></a>`).join("");
}

function buildLineChart(points, gradientId, reserve, height = 300, width = 760) {
  const pad = { top: 22, right: 20, bottom: 38, left: 58 };
  const values = [...points.map((point) => point.value), reserve];
  const min = Math.floor((Math.min(...values) - 30000) / 50000) * 50000;
  const max = Math.ceil((Math.max(...values) + 30000) / 50000) * 50000;
  const x = (index) => pad.left + (index * (width - pad.left - pad.right)) / Math.max(points.length - 1, 1);
  const y = (value) => pad.top + ((max - value) * (height - pad.top - pad.bottom)) / Math.max(max - min, 1);
  const linePath = (subset) => subset.map((point, index) => `${index ? "L" : "M"}${x(point.index).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
  const indexed = points.map((point, index) => ({ ...point, index }));
  const actual = indexed.filter((point) => point.kind === "actual");
  const firstForecast = indexed.find((point) => point.kind === "forecast");
  const forecast = firstForecast ? [actual[actual.length - 1], ...indexed.filter((point) => point.kind === "forecast")] : [];
  const areaPath = `${linePath(indexed)} L${x(points.length - 1)},${height - pad.bottom} L${x(0)},${height - pad.bottom} Z`;
  const ticks = [min, min + (max - min) / 2, max];
  const labelEvery = points.length > 8 ? 2 : 1;
  return `<svg class="cash-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Cash balance chart. Recorded values lead into a simulated forecast with a minimum reserve line.">
    <defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5eead4" stop-opacity=".28"/><stop offset="100%" stop-color="#5eead4" stop-opacity=".01"/></linearGradient></defs>
    ${ticks.map((tick) => `<line class="grid-line" x1="${pad.left}" y1="${y(tick)}" x2="${width - pad.right}" y2="${y(tick)}"/><text x="4" y="${y(tick) + 4}">${rm(tick).replace("RM", "RM ")}</text>`).join("")}
    <line class="reserve-line" x1="${pad.left}" y1="${y(reserve)}" x2="${width - pad.right}" y2="${y(reserve)}"/><text x="${width - 107}" y="${y(reserve) - 7}">Reserve</text>
    <path class="area" d="${areaPath}" fill="url(#${gradientId})"/>
    <path class="actual-line" d="${linePath(actual)}"/>
    ${forecast.length ? `<path class="forecast-line" d="${linePath(forecast)}"/>` : ""}
    ${indexed.map((point) => `<circle class="point" cx="${x(point.index)}" cy="${y(point.value)}" r="3.5" tabindex="0"><title>${point.date}: ${rm(point.value)} · ${point.kind === "forecast" ? "Forecast" : "Recorded"}</title></circle>`).join("")}
    ${indexed.map((point, index) => index % labelEvery === 0 ? `<text x="${x(index)}" y="${height - 12}" text-anchor="middle">${point.date}</text>` : "").join("")}
  </svg>`;
}

function renderCashFlow() {
  if (!state.data) return;
  const allPoints = getAdjustedCashFlowPoints();
  const count = state.forecastRange === 30 ? 8 : state.forecastRange === 60 ? 10 : allPoints.length;
  const points = allPoints.slice(0, count);
  $("#cash-flow-chart").innerHTML = buildLineChart(points, "cashflow-gradient", state.reserve, 260, 1120);
  $("#cash-flow-summary").innerHTML = `
    <div><span>Current business cash</span><strong>${rm(state.data.balances.total_business_cash)}</strong></div>
    <div><span>Forecast low</span><strong>${rm(Math.min(...points.filter((point) => point.kind === "forecast").map((point) => point.value)))}</strong></div>
    <div><span>Minimum reserve</span><strong>${rm(state.reserve)}</strong></div>`;
  $("#expense-total").textContent = `${rm(sumExpenses())} total · Demo data`;
  $("#payment-schedule").innerHTML = getUpcomingExpenses().map((expense) => `
    <div class="schedule-row"><span class="date">${expense.date.replace(" 2026", "")}</span><div><strong>${expense.payee}</strong><small>${expense.category}</small></div><span class="status ${expense.status === "Forecast" ? "status--forecast" : expense.status === "New" ? "status--urgent" : ""}">${expense.status}</span><span class="amount">${rm(expense.amount)}</span></div>`).join("");
}

function renderInvestments() {
  if (!state.data) return;
  const fund = state.data.investment;
  const isShariah = state.compliance === "Shariah";
  const fundName = isShariah ? fund.fund_name : "Prima Liquidity Fund";
  const classification = isShariah ? fund.classification : "Conventional money market fund (fictional)";
  $("#compliance-badge").textContent = `${state.compliance} preference`;
  $("#portfolio-card").innerHTML = `
    <div class="fund-head"><div class="fund-identity"><span class="fund-logo">${isShariah ? "AL" : "PL"}</span><div><h3>${fundName}</h3><p>${classification} · Demo data</p></div></div><span class="risk-chip">${fund.risk_level}</span></div>
    <div class="portfolio-balance"><span>Simulated invested balance</span><strong>${rm(fund.invested_balance)}</strong></div>
    <div class="portfolio-stats"><div><span>Indicative return p.a.</span><strong>${percent(fund.indicative_return_pa)}</strong></div><div><span>Est. monthly return</span><strong>${rm(fund.estimated_return_month)}</strong></div><div><span>Liquidity</span><strong>${fund.liquidity}</strong></div></div>`;
  const colours = ["#0f766e", "#5abfb2", "#cbd8d5"];
  const conventionalLabels = ["Term deposits", "Short-term instruments", "Cash equivalents"];
  let start = 0;
  const segments = fund.allocation.map((item, index) => {
    const segment = `${colours[index]} ${start}% ${start + item.percent}%`;
    start += item.percent;
    return segment;
  });
  $("#allocation-donut").style.background = `conic-gradient(${segments.join(",")})`;
  $("#allocation-legend").innerHTML = fund.allocation.map((item, index) => `<div><i style="background:${colours[index]}"></i><span>${isShariah ? item.name : conventionalLabels[index]}</span><strong>${item.percent}%</strong></div>`).join("");
}

function renderTransactions() {
  if (!state.data) return;
  const query = $("#transaction-search").value.trim().toLowerCase();
  const type = $("#type-filter").value;
  const status = $("#status-filter").value;
  const rows = state.data.transactions.filter((item) => {
    const searchable = `${item.id} ${item.description} ${item.category}`.toLowerCase();
    return (!query || searchable.includes(query)) && (type === "All" || item.type === type) && (status === "All" || item.status === status);
  });
  $("#transaction-count").textContent = `${rows.length} transaction${rows.length === 1 ? "" : "s"}`;
  $("#transactions-body").innerHTML = rows.map((item) => `
    <tr><td>${item.date}</td><td><strong>${item.description}</strong><small>${item.id} · ${item.category}</small></td><td>${item.type}</td><td><span class="status ${item.status === "Pending" ? "status--forecast" : ""}">${item.status}</span></td><td class="align-right ${item.amount > 0 ? "amount-positive" : "amount-negative"}"><strong>${rm(item.amount, true)}</strong></td></tr>`).join("");
  $(".table-scroll").hidden = rows.length === 0;
  $("#transactions-empty").hidden = rows.length !== 0;
}

function renderReports() {
  if (!state.data) return;
  const reports = state.data.reports;
  $("#report-tabs").innerHTML = reports.map((report, index) => `<button type="button" role="tab" aria-selected="${index === state.currentReport}" class="${index === state.currentReport ? "active" : ""}" data-report="${index}">${report.month}</button>`).join("");
  $$("button", $("#report-tabs")).forEach((button) => button.addEventListener("click", () => {
    state.currentReport = Number(button.dataset.report);
    renderReports();
  }));
  const report = reports[state.currentReport];
  const net = report.inflows - report.outflows;
  const cards = [
    ["Opening cash", report.opening_cash, "Start of month"],
    ["Net cash movement", net, "Inflows less outflows"],
    ["Closing cash", report.closing_cash, "End / current balance"],
    ["Est. fund return", report.investment_return, "Indicative and simulated"]
  ];
  $("#report-kpis").innerHTML = cards.map(([label, value, note]) => `<article class="card kpi-card"><p>${label}</p><strong>${rm(value, label === "Net cash movement")}</strong><small>${note} · Demo data</small></article>`).join("");
  const weeklyPatterns = [
    { inflows: [.18, .27, .22, .33], outflows: [.24, .19, .34, .23] },
    { inflows: [.24, .21, .31, .24], outflows: [.2, .3, .22, .28] },
    { inflows: [.2, .29, .25, .26], outflows: [.27, .21, .25, .27] }
  ];
  const pattern = weeklyPatterns[state.currentReport % weeklyPatterns.length];
  const distribute = (total, weights) => {
    const values = weights.slice(0, -1).map((weight) => Math.round(total * weight));
    values.push(total - values.reduce((sum, value) => sum + value, 0));
    return values;
  };
  const weeklyInflows = distribute(report.inflows, pattern.inflows);
  const weeklyOutflows = distribute(report.outflows, pattern.outflows);
  const weeklyMax = Math.max(...weeklyInflows, ...weeklyOutflows);
  const weeklyBars = weeklyInflows.map((inflow, index) => {
    const outflow = weeklyOutflows[index];
    const weekNet = inflow - outflow;
    return `<div class="week-group">
      <div class="bar-pair">
        <div class="bar-wrap"><small>${rm(inflow)}</small><div class="bar bar--in" style="height:${Math.max(8, (inflow / weeklyMax) * 150)}px" title="Week ${index + 1} cash in: ${rm(inflow)}"></div></div>
        <div class="bar-wrap"><small>${rm(outflow)}</small><div class="bar bar--out" style="height:${Math.max(8, (outflow / weeklyMax) * 150)}px" title="Week ${index + 1} cash out: ${rm(outflow)}"></div></div>
      </div>
      <strong>Week ${index + 1}</strong>
      <span class="week-net ${weekNet < 0 ? "negative" : ""}">${rm(weekNet, true)} net</span>
    </div>`;
  }).join("");
  $("#report-chart").innerHTML = `
    <div class="bar-chart-legend"><span><i class="legend-in"></i>Cash in · ${rm(report.inflows)}</span><span><i class="legend-out"></i>Cash out · ${rm(report.outflows)}</span></div>
    <div class="weekly-bars" role="img" aria-label="Illustrative weekly cash in and cash out for ${report.month}">${weeklyBars}</div>
    <p class="bar-chart-note">Illustrative weekly distribution of the simulated monthly totals.</p>`;
  $("#report-note").innerHTML = `<span class="report-orb" aria-hidden="true">▥</span><span class="section-label">${report.month} summary</span><h3>${net >= 0 ? "Cash strengthened this month" : "Cash reduced this month"}</h3><p>Fictional inflows ${net >= 0 ? "exceeded" : "were below"} outflows by ${rm(Math.abs(net))}. Average estimated surplus was ${rm(report.average_surplus)}.</p><dl><div><dt>Average surplus</dt><dd>${rm(report.average_surplus)}</dd></div><div><dt>Indicative fund return</dt><dd>${rm(report.investment_return)}</dd></div><div><dt>Data status</dt><dd>Simulated</dd></div></dl>`;
}

function renderIntegrations() {
  if (!state.data) return;
  $("#integration-grid").innerHTML = state.data.integrations.map((item) => {
    const connected = item.status === "Connected";
    return `<article class="card integration-card" data-integration="${item.id}"><div class="integration-top"><span class="integration-logo">${item.name.split(" ").map((word) => word[0]).slice(0,2).join("")}</span><div class="integration-copy"><h3>${item.name}</h3><p>${item.type} connection · Simulated</p></div><span class="connection-status ${connected ? "" : "available"}">${item.status}</span></div><div class="integration-meta"><div><span>Demo account</span><strong>${item.account}</strong></div><div><span>Last simulated sync</span><strong>${item.last_sync}</strong></div></div><div class="integration-actions"><small>No external data access</small><button class="button ${connected ? "button--secondary" : "button--primary"}" type="button" data-integration-action="${item.id}">${connected ? "Simulate resync" : "Simulate connection"}</button></div></article>`;
  }).join("");
  $$('[data-integration-action]').forEach((button) => button.addEventListener("click", () => simulateIntegration(button.dataset.integrationAction)));
}

function simulateIntegration(id) {
  const integration = state.data.integrations.find((item) => item.id === id);
  if (!integration) return;
  if (integration.status === "Available") {
    integration.status = "Connected";
    integration.account = "Demo account ••0000";
    integration.last_sync = "Just now (simulated)";
    showToast("Demo connection added", `${integration.name} is shown as connected in this browser only.`);
  } else {
    integration.last_sync = "Just now (simulated)";
    showToast("Simulated sync complete", `${integration.name} did not contact an external service.`);
  }
  renderIntegrations();
}

function renderSettings() {
  if (!state.data) return;
  $("#reserve-input").value = state.reserve;
  $("#notify-sweeps").checked = state.data.settings.notifications.sweep_proposals;
  $("#notify-warnings").checked = state.data.settings.notifications.forecast_warnings;
  $("#notify-weekly").checked = state.data.settings.notifications.weekly_summary;
  $("#settings-compliance").textContent = state.compliance;
  $("#settings-compliance-detail").textContent = state.compliance === "Shariah" ? "Show Shariah-compliant fund examples" : "Show conventional fund examples";
  updateReserveImpact();
}

function renderProfile() {
  if (!state.data || !state.profile) return;
  const profile = state.profile;
  const company = state.data.company;
  const meta = state.data.meta;
  const points = getAdjustedCashFlowPoints();
  const forecastValues = points.filter((point) => point.kind === "forecast").map((point) => point.value);
  const forecastLow = forecastValues.length ? Math.min(...forecastValues) : state.data.balances.total_business_cash;

  $("#profile-avatar-large").textContent = initials(profile.name);
  $("#profile-display-name").textContent = profile.name;
  $("#profile-display-email").textContent = profile.email;
  $("#profile-display-role").textContent = profile.role;
  $("#profile-name").value = profile.name;
  $("#profile-role").value = profile.role;
  $("#profile-email").value = profile.email;

  $("#business-profile-name").textContent = company.name;
  $("#business-profile-industry").textContent = company.industry;
  $("#business-profile-location").textContent = company.location;
  $("#business-profile-currency").textContent = meta.currency;
  $("#business-profile-horizon").textContent = meta.forecast_horizon;

  $("#profile-chart").innerHTML = buildLineChart(points, "profile-gradient", state.reserve, 245);
  $("#profile-chart-footer").innerHTML = `
    <div><span>Current business cash</span><strong>${rm(state.data.balances.total_business_cash)}</strong></div>
    <div><span>Forecast low</span><strong>${rm(forecastLow)}</strong></div>
    <div><span>Protected reserve</span><strong>${rm(state.reserve)}</strong></div>`;
}

function saveProfile(event) {
  event.preventDefault();
  const nameInput = $("#profile-name");
  const roleInput = $("#profile-role");
  const emailInput = $("#profile-email");
  const name = nameInput.value.trim();
  const role = roleInput.value.trim();
  const email = emailInput.value.trim();

  setFieldError(nameInput, $("#profile-name-error"), name ? "" : "Enter your name.");
  setFieldError(roleInput, $("#profile-role-error"), role ? "" : "Enter your job title.");
  setFieldError(emailInput, $("#profile-email-error"), isValidEmail(email) && emailInput.validity.valid ? "" : "Enter a valid work email address.");

  const firstInvalid = [nameInput, roleInput, emailInput].find((input) => input.getAttribute("aria-invalid") === "true");
  if (firstInvalid) {
    firstInvalid.focus();
    return;
  }

  state.profile = { name, role, email };
  state.userEmail = email;
  $("#user-avatar").textContent = initials(name);
  const session = readSession() || {};
  session.email = email;
  session.compliance = state.compliance;
  sessionStorage.setItem("tunaiPintarDemoSession", JSON.stringify(session));
  renderProfile();
  showToast("Profile updated", "Your demo user and business profile remain stored in this browser session only.");
}

function updateReserveImpact() {
  if (!state.data) return;
  const value = Number($("#reserve-input").value);
  if (!Number.isFinite(value) || value < 50000 || value > 400000) {
    $("#reserve-impact").textContent = "Enter a valid reserve to see its effect.";
    return;
  }
  const estimatedSurplus = Math.max(0, state.data.balances.total_business_cash - value);
  $("#reserve-impact").innerHTML = `Cash above the selected reserve would be <strong>${rm(estimatedSurplus)}</strong>. This setting does not place or change investments.`;
}

function saveSettings(event) {
  event.preventDefault();
  const reserve = Number($("#reserve-input").value);
  $("#reserve-error").textContent = "";
  if (!Number.isFinite(reserve) || reserve < 50000 || reserve > 400000) {
    $("#reserve-error").textContent = "Enter an amount between RM50,000 and RM400,000.";
    $("#reserve-input").focus();
    return;
  }
  state.reserve = reserve;
  state.data.settings.notifications = {
    sweep_proposals: $("#notify-sweeps").checked,
    forecast_warnings: $("#notify-warnings").checked,
    weekly_summary: $("#notify-weekly").checked
  };
  renderAll();
  showToast("Demo settings updated", "Your changes are temporary and were not saved to a server.");
}

function toggleCompliance() {
  state.compliance = state.compliance === "Shariah" ? "Non-Shariah" : "Shariah";
  const session = readSession();
  if (session) {
    session.compliance = state.compliance;
    sessionStorage.setItem("tunaiPintarDemoSession", JSON.stringify(session));
  }
  renderInvestments();
  renderSettings();
  showToast("Preference switched", `${state.compliance} examples are now shown. This is a demo-only change.`);
}

function exportReport() {
  const report = state.data.reports[state.currentReport];
  const contents = [
    "TUNAIPINTAR DEMO REPORT",
    report.month,
    "",
    "All figures below are fictional demo data. This is not financial advice.",
    `Opening cash: ${rm(report.opening_cash)}`,
    `Inflows: ${rm(report.inflows)}`,
    `Outflows: ${rm(report.outflows)}`,
    `Closing cash: ${rm(report.closing_cash)}`,
    `Average estimated surplus: ${rm(report.average_surplus)}`,
    `Indicative simulated investment return: ${rm(report.investment_return)}`
  ].join("\n");
  const url = URL.createObjectURL(new Blob([contents], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `TunaiPintar-demo-report-${report.short_month.toLowerCase()}-2026.txt`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Demo report prepared", "A plain-text fictional report was generated in your browser.");
}

function openSidebar() {
  $("#sidebar").classList.add("open");
  $("#sidebar-scrim").classList.add("open");
  $("#menu-button").setAttribute("aria-expanded", "true");
  $("#sidebar-close").focus();
}

function closeSidebar() {
  $("#sidebar").classList.remove("open");
  $("#sidebar-scrim").classList.remove("open");
  $("#menu-button").setAttribute("aria-expanded", "false");
}

function showToast(title, message) {
  clearTimeout(state.toastTimer);
  $("#toast-title").textContent = title;
  $("#toast-message").textContent = message;
  $("#toast").hidden = false;
  state.toastTimer = setTimeout(hideToast, 5000);
}

function hideToast() {
  clearTimeout(state.toastTimer);
  $("#toast").hidden = true;
}

function getAdjustedCashFlowPoints() {
  return state.data.cash_flow.points.map((point) => ({ ...point }));
}

function getUpcomingExpenses() {
  return state.data.upcoming_expenses.map((expense) => ({ ...expense }));
}

function sumExpenses() {
  return getUpcomingExpenses().reduce((sum, expense) => sum + expense.amount, 0);
}
