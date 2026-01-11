const tabs = document.querySelectorAll(".tab");
const steps = document.querySelectorAll(".step");
const loading = document.getElementById("loading");
const validationPanel = document.getElementById("validation-panel");
const validationGrid = document.getElementById("validation-grid");
const predictionMetrics = document.getElementById("prediction-metrics");
const efficiencyMetrics = document.getElementById("efficiency-metrics");
const efficiencyStatus = document.getElementById("efficiency-status");
const storySummary = document.getElementById("story-summary");
const scenarioTable = document.getElementById("scenario-table");
const topScenarios = document.getElementById("top-scenarios");
const decisionOutput = document.getElementById("decision-output");
const explainableAi = document.getElementById("explainable-ai");
const riskAnalysis = document.getElementById("risk-analysis");
const comparison = document.getElementById("comparison");
const reportOutput = document.getElementById("report-output");
const downloadReport = document.getElementById("download-report");

let caseStudy = null;
let goalMode = null;
let scenarios = [];
let optimalSet = null;

const commodityProfiles = {
  padi: { baseYield: 5.8, optimalRain: 180, optimalTemp: 26, price: 5200000 },
  jagung: { baseYield: 6.4, optimalRain: 150, optimalTemp: 27, price: 4200000 },
  cabai: { baseYield: 7.2, optimalRain: 140, optimalTemp: 25, price: 18000000 }
};

const methodMultiplier = {
  manual: 0.95,
  "semi-modern": 1.05,
  modern: 1.15
};

const ranges = {
  area: [0.2, 10],
  fertilizer: [150, 700],
  rainfall: [80, 260],
  temperature: [20, 32],
  cost: [3000000, 50000000]
};

const currency = (value) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(value);

const toFixed = (value, digit = 2) => Number.parseFloat(value).toFixed(digit);

const switchStep = (stepId) => {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.step === stepId));
  steps.forEach((step) => step.classList.toggle("active", step.id === `step-${stepId}`));
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => switchStep(tab.dataset.step));
});

const showLoading = (isVisible) => {
  loading.classList.toggle("hidden", !isVisible);
};

const buildStatusBadge = (status) => {
  if (status === "valid") return "badge-valid";
  if (status === "attention") return "badge-attention";
  return "badge-out";
};

const evaluateStatus = (value, [min, max]) => {
  if (value < min * 0.8 || value > max * 1.2) return "out";
  if (value < min || value > max) return "attention";
  return "valid";
};

const diagnoseInputs = (data) => {
  const statuses = {
    area: evaluateStatus(data.area, ranges.area),
    fertilizer: evaluateStatus(data.fertilizer, ranges.fertilizer),
    rainfall: evaluateStatus(data.rainfall, ranges.rainfall),
    temperature: evaluateStatus(data.temperature, ranges.temperature),
    cost: evaluateStatus(data.cost, ranges.cost)
  };

  validationGrid.innerHTML = Object.entries(statuses)
    .map(([key, status]) => {
      const labelMap = {
        area: "Luas Lahan",
        fertilizer: "Pupuk",
        rainfall: "Curah Hujan",
        temperature: "Suhu",
        cost: "Biaya Produksi"
      };
      return `
        <div class="status-card">
          <strong>${labelMap[key]}</strong>
          <p>${data[key]}</p>
          <span class="${buildStatusBadge(status)}">${status === "valid" ? "Valid" : status === "attention" ? "Perlu perhatian" : "Di luar rentang"}</span>
        </div>
      `;
    })
    .join("");

  validationPanel.classList.remove("hidden");
  return statuses;
};

const predictYield = (data) => {
  const profile = commodityProfiles[data.commodity];
  const fertilizerImpact = Math.min(data.fertilizer / 500, 1.3);
  const rainGap = Math.abs(data.rainfall - profile.optimalRain);
  const tempGap = Math.abs(data.temperature - profile.optimalTemp);
  const climatePenalty = 1 - Math.min((rainGap / 200 + tempGap / 10) / 2, 0.3);
  const methodImpact = methodMultiplier[data.method] || 1;
  const areaImpact = Math.min(data.area / 2, 1.2);

  const yieldPerHa = profile.baseYield * fertilizerImpact * climatePenalty * methodImpact * areaImpact;
  const totalYield = yieldPerHa * data.area;
  const revenue = totalYield * profile.price;

  const confidenceScore = 1 - Math.min((rainGap / 220 + tempGap / 12) / 2, 0.6);
  const inputStatusFactor = Object.values(diagnoseInputs(data)).filter((status) => status === "valid").length / 5;
  const combinedConfidence = (confidenceScore + inputStatusFactor) / 2;
  const confidence = combinedConfidence > 0.75 ? "High" : combinedConfidence > 0.55 ? "Medium" : "Low";

  const confidenceNote =
    confidence === "High"
      ? "Data mayoritas dalam rentang historis dan kondisi iklim relatif stabil."
      : confidence === "Medium"
      ? "Terdapat variabel di luar kondisi optimal sehingga perlu kalibrasi."
      : "Input berada di luar rentang data latih, hasil hanya simulasi.";

  return { yieldPerHa, totalYield, revenue, confidence, confidenceNote };
};

const computeEfficiency = (data, revenue) => {
  const rcRatio = revenue / data.cost;
  const bcRatio = (revenue - data.cost) / data.cost;
  const profit = revenue - data.cost;
  const pricePerTon = commodityProfiles[data.commodity].price;
  const bep = data.cost / pricePerTon;

  let status = "Efisien";
  if (rcRatio < 1) status = "Tidak Efisien";
  else if (rcRatio < 1.2) status = "Kurang Efisien";

  return { rcRatio, bcRatio, profit, bep, status };
};

const renderAnalysis = (prediction, efficiency) => {
  predictionMetrics.innerHTML = `
    <div>Yield/Ha: <strong>${toFixed(prediction.yieldPerHa)} ton</strong></div>
    <div>Total Yield: <strong>${toFixed(prediction.totalYield)} ton</strong></div>
    <div>Estimasi Pendapatan: <strong>${currency(prediction.revenue)}</strong></div>
    <div>Confidence: <strong>${prediction.confidence}</strong></div>
    <div class="note">${prediction.confidenceNote}</div>
  `;

  efficiencyMetrics.innerHTML = `
    <div>R/C Ratio: <strong>${toFixed(efficiency.rcRatio)}</strong></div>
    <div>B/C Ratio: <strong>${toFixed(efficiency.bcRatio)}</strong></div>
    <div>Profit Bersih: <strong>${currency(efficiency.profit)}</strong></div>
    <div>BEP Produksi: <strong>${toFixed(efficiency.bep)} ton</strong></div>
  `;
  efficiencyStatus.textContent = efficiency.status;
  efficiencyStatus.style.background =
    efficiency.status === "Efisien" ? "#dcfce7" : efficiency.status === "Kurang Efisien" ? "#fef3c7" : "#fee2e2";
  efficiencyStatus.style.color = efficiency.status === "Efisien" ? "#166534" : efficiency.status === "Kurang Efisien" ? "#92400e" : "#991b1b";
};

const renderStorytelling = (data, prediction, efficiency) => {
  storySummary.innerHTML = `
    <div>Komoditas <strong>${data.commodity.toUpperCase()}</strong> di lahan ${data.area} Ha diperkirakan menghasilkan ${toFixed(prediction.totalYield)} ton.</div>
    <div>Dengan biaya ${currency(data.cost)}, profit bersih sebesar ${currency(efficiency.profit)} dan R/C ${toFixed(efficiency.rcRatio)}.</div>
    <div>Strategi optimal akan fokus pada tujuan <strong>${goalMode?.label || "belum dipilih"}</strong>.</div>
  `;
};

const buildScenario = (data, fertilizerMultiplier, method, laborCostFactor, climateDelta) => {
  const scenarioData = { ...data };
  scenarioData.fertilizer = data.fertilizer * fertilizerMultiplier;
  scenarioData.method = method;
  scenarioData.cost = data.cost * laborCostFactor;
  scenarioData.rainfall = data.rainfall + climateDelta.rain;
  scenarioData.temperature = data.temperature + climateDelta.temp;

  const prediction = predictYield(scenarioData);
  const efficiency = computeEfficiency(scenarioData, prediction.revenue);
  const risk = Math.min(Math.abs(climateDelta.rain) / 50 + Math.abs(climateDelta.temp) / 4, 1);

  return {
    ...scenarioData,
    prediction,
    efficiency,
    risk,
    score: efficiency.profit - risk * 0.2 * efficiency.profit
  };
};

const generateScenarios = (data) => {
  const fertilizerLevels = [0.8, 1, 1.2];
  const methods = ["manual", "semi-modern", "modern"];
  const laborCosts = [0.9, 1, 1.15];
  const climateAdjustments = [
    { rain: -20, temp: -1 },
    { rain: 0, temp: 0 },
    { rain: 15, temp: 1 }
  ];

  const results = [];
  fertilizerLevels.forEach((fert) => {
    methods.forEach((method) => {
      laborCosts.forEach((labor) => {
        climateAdjustments.forEach((climate) => {
          results.push(buildScenario(data, fert, method, labor, climate));
        });
      });
    });
  });
  return results;
};

const renderScenarioTable = (list) => {
  scenarioTable.innerHTML = `
    <div class="table-row header">
      <div>Skenario</div>
      <div>Metode</div>
      <div>Pupuk (Kg)</div>
      <div>Yield (Ton)</div>
      <div>Profit</div>
      <div>Risiko</div>
    </div>
  `;

  list.slice(0, 10).forEach((scenario, index) => {
    scenarioTable.innerHTML += `
      <div class="table-row">
        <div>#${index + 1}</div>
        <div>${scenario.method}</div>
        <div>${toFixed(scenario.fertilizer, 0)}</div>
        <div>${toFixed(scenario.prediction.totalYield)}</div>
        <div>${currency(scenario.efficiency.profit)}</div>
        <div>${scenario.risk < 0.35 ? "Rendah" : scenario.risk < 0.7 ? "Sedang" : "Tinggi"}</div>
      </div>
    `;
  });
};

const selectTopScenarios = (list, goal) => {
  const sorted = [...list].sort((a, b) => {
    if (goal === "profit") return b.efficiency.profit - a.efficiency.profit;
    if (goal === "efficiency") return b.efficiency.rcRatio - a.efficiency.rcRatio;
    if (goal === "cost") return a.cost - b.cost;
    if (goal === "stability") return a.risk - b.risk;
    return b.score - a.score;
  });

  return {
    optimal: sorted[0],
    alternative: sorted[1],
    economical: sorted.find((item) => item.cost === Math.min(...sorted.map((s) => s.cost)))
  };
};

const renderTopScenarios = (selection) => {
  topScenarios.innerHTML = [
    { label: "Skenario Optimal", data: selection.optimal },
    { label: "Skenario Alternatif", data: selection.alternative },
    { label: "Skenario Hemat Biaya", data: selection.economical }
  ]
    .map(
      (item) => `
      <div class="status-card">
        <strong>${item.label}</strong>
        <p>Metode: ${item.data.method} • Pupuk: ${toFixed(item.data.fertilizer, 0)} Kg</p>
        <p>Profit: ${currency(item.data.efficiency.profit)} • R/C: ${toFixed(item.data.efficiency.rcRatio)}</p>
        <span class="badge-valid">Risiko ${item.data.risk < 0.35 ? "Rendah" : item.data.risk < 0.7 ? "Sedang" : "Tinggi"}</span>
      </div>
    `
    )
    .join("");
};

const renderDecision = (selection) => {
  const goalMap = {
    profit: "Profit tertinggi",
    efficiency: "Efisiensi tertinggi",
    cost: "Biaya terendah",
    stability: "Risiko terendah"
  };
  decisionOutput.innerHTML = `
    <p><strong>Tujuan:</strong> ${goalMap[goalMode.value]}</p>
    <p>Rekomendasi utama menggunakan metode <strong>${selection.optimal.method}</strong> dengan pupuk ${toFixed(
    selection.optimal.fertilizer,
    0
  )} Kg dan biaya ${currency(selection.optimal.cost)}.</p>
    <p>Perkiraan profit ${currency(selection.optimal.efficiency.profit)} dan yield ${toFixed(
    selection.optimal.prediction.totalYield
  )} ton.</p>
  `;
};

const renderExplainable = (data, selection) => {
  const factors = [
    `Pupuk ${toFixed(selection.optimal.fertilizer, 0)} Kg meningkatkan potensi yield hingga ${toFixed(
      selection.optimal.prediction.yieldPerHa
    )} ton/Ha.`,
    `Metode ${selection.optimal.method} memberi multiplier produktivitas ${methodMultiplier[selection.optimal.method]}.`,
    `Perubahan iklim sebesar ${selection.optimal.rainfall - data.rainfall} mm mempengaruhi risiko produksi.`,
    `Biaya tenaga kerja ${currency(selection.optimal.cost)} menjaga margin profit.`
  ];

  const tradeOff = `Trade-off utama: peningkatan yield meningkatkan biaya, namun profit bersih tetap naik ${currency(
    selection.optimal.efficiency.profit - data.cost
  )}.`;

  explainableAi.innerHTML = `
    <ul>
      ${factors.map((factor) => `<li>${factor}</li>`).join("")}
    </ul>
    <p class="note">${tradeOff}</p>
  `;
};

const renderRiskAnalysis = (selection) => {
  const baseProfit = selection.optimal.efficiency.profit;
  const priceShifts = [0.8, 0.9, 1, 1.1, 1.2];
  const profitRange = priceShifts.map((shift) => baseProfit * shift);
  const minProfit = Math.min(...profitRange);
  const maxProfit = Math.max(...profitRange);
  const riskScore = (maxProfit - minProfit) / Math.max(baseProfit, 1);
  const riskLabel = riskScore < 0.2 ? "Rendah" : riskScore < 0.4 ? "Sedang" : "Tinggi";

  riskAnalysis.innerHTML = `
    <p>Sensitivitas harga ±10–20% menghasilkan rentang profit ${currency(minProfit)} hingga ${currency(maxProfit)}.</p>
    <div class="risk-bar"><span style="width: ${Math.min(riskScore * 100, 100)}%"></span></div>
    <p>Indikator Risiko: <strong>${riskLabel}</strong></p>
  `;
};

const renderComparison = (data, selection, prediction, efficiency) => {
  comparison.innerHTML = `
    <p><strong>Awal:</strong> Yield ${toFixed(prediction.totalYield)} ton, Profit ${currency(efficiency.profit)}.</p>
    <p><strong>Optimal:</strong> Yield ${toFixed(selection.optimal.prediction.totalYield)} ton, Profit ${currency(
    selection.optimal.efficiency.profit
  )}.</p>
    <p>Gap profit: ${currency(selection.optimal.efficiency.profit - efficiency.profit)}.</p>
  `;
};

const buildReport = (data, prediction, efficiency, selection) => {
  return `LAPORAN ANALISIS AGRISMART\n\n` +
    `1. Data Input\n` +
    `- Komoditas: ${data.commodity}\n` +
    `- Luas Lahan: ${data.area} Ha\n` +
    `- Pupuk: ${data.fertilizer} Kg\n` +
    `- Curah Hujan: ${data.rainfall} mm/bulan\n` +
    `- Suhu: ${data.temperature} °C\n` +
    `- Biaya Produksi: ${currency(data.cost)}\n` +
    `- Metode Budidaya: ${data.method}\n\n` +
    `2. Metode Analisis\n` +
    `- Simulasi inference berbasis rule-based dan asumsi agribisnis.\n` +
    `- Scenario engine menghasilkan variasi pupuk, metode, biaya, dan iklim.\n` +
    `- Optimization engine menyesuaikan tujuan: ${goalMode.label}.\n\n` +
    `3. Hasil Prediksi\n` +
    `- Yield/Ha: ${toFixed(prediction.yieldPerHa)} ton\n` +
    `- Total Yield: ${toFixed(prediction.totalYield)} ton\n` +
    `- Pendapatan: ${currency(prediction.revenue)}\n` +
    `- Confidence: ${prediction.confidence} (${prediction.confidenceNote})\n\n` +
    `4. Efisiensi Agribisnis\n` +
    `- R/C Ratio: ${toFixed(efficiency.rcRatio)}\n` +
    `- B/C Ratio: ${toFixed(efficiency.bcRatio)}\n` +
    `- Profit Bersih: ${currency(efficiency.profit)}\n` +
    `- BEP Produksi: ${toFixed(efficiency.bep)} ton\n\n` +
    `5. Skenario Optimal\n` +
    `- Metode: ${selection.optimal.method}\n` +
    `- Pupuk: ${toFixed(selection.optimal.fertilizer, 0)} Kg\n` +
    `- Profit: ${currency(selection.optimal.efficiency.profit)}\n` +
    `- Risiko: ${selection.optimal.risk < 0.35 ? "Rendah" : selection.optimal.risk < 0.7 ? "Sedang" : "Tinggi"}\n\n` +
    `6. Rekomendasi\n` +
    `- Prioritaskan skenario optimal untuk mencapai ${goalMode.label}.\n` +
    `- Pantau sensitivitas harga pasar dan iklim sebelum implementasi.\n\n` +
    `7. Keterbatasan\n` +
    `- Sistem ini adalah prototype akademik.\n` +
    `- Model AI menggunakan simulasi inference.\n` +
    `- Validasi lapangan diperlukan untuk implementasi nyata.\n`;
};

const updateAnalytics = (data) => {
  const prediction = predictYield(data);
  const efficiency = computeEfficiency(data, prediction.revenue);
  renderAnalysis(prediction, efficiency);
  renderStorytelling(data, prediction, efficiency);

  scenarios = generateScenarios(data);
  renderScenarioTable(scenarios);

  if (goalMode) {
    optimalSet = selectTopScenarios(scenarios, goalMode.value);
    renderTopScenarios(optimalSet);
    renderDecision(optimalSet);
    renderExplainable(data, optimalSet);
    renderRiskAnalysis(optimalSet);
    renderComparison(data, optimalSet, prediction, efficiency);
  }

  return { prediction, efficiency };
};

document.getElementById("input-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData.entries());

  caseStudy = {
    commodity: data.commodity,
    area: Number(data.area),
    fertilizer: Number(data.fertilizer),
    rainfall: Number(data.rainfall),
    temperature: Number(data.temperature),
    cost: Number(data.cost),
    method: data.method
  };

  showLoading(true);
  setTimeout(() => {
    updateAnalytics(caseStudy);
    showLoading(false);
    switchStep("analysis");
  }, 600);
});

document.getElementById("goal-confirm").addEventListener("click", () => {
  const selected = document.querySelector("input[name='goal']:checked");
  if (!selected) {
    alert("Silakan pilih tujuan terlebih dahulu.");
    return;
  }
  const labels = {
    profit: "Maksimalkan Profit",
    efficiency: "Maksimalkan Efisiensi (R/C)",
    cost: "Minimalkan Biaya Produksi",
    stability: "Produksi Stabil (Risiko Rendah)"
  };
  goalMode = { value: selected.value, label: labels[selected.value] };
  if (caseStudy) {
    updateAnalytics(caseStudy);
  }
  switchStep("analysis");
});

document.getElementById("run-simulation").addEventListener("click", () => {
  if (!caseStudy) {
    alert("Lengkapi input data terlebih dahulu.");
    return;
  }
  showLoading(true);
  setTimeout(() => {
    scenarios = generateScenarios(caseStudy);
    renderScenarioTable(scenarios);
    showLoading(false);
  }, 600);
});

document.getElementById("generate-report").addEventListener("click", () => {
  if (!caseStudy || !optimalSet) {
    alert("Lengkapi input data dan tujuan sebelum membuat laporan.");
    return;
  }
  const prediction = predictYield(caseStudy);
  const efficiency = computeEfficiency(caseStudy, prediction.revenue);
  const report = buildReport(caseStudy, prediction, efficiency, optimalSet);
  reportOutput.textContent = report;
  downloadReport.disabled = false;
});

downloadReport.addEventListener("click", () => {
  const blob = new Blob([reportOutput.textContent], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "laporan-agriSmart.txt";
  link.click();
  URL.revokeObjectURL(link.href);
});
