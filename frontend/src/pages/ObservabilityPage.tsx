// frontend/src/pages/ObservabilityPage.tsx
import { useState, useEffect, useCallback } from "react";

const API_BASE = "/prometheus";

interface PrometheusResult {
	metric: Record<string, string>;
	value: [number, string];
	values?: [number, string][];
}

const query = async (promql: string): Promise<PrometheusResult[]> => {
	const res = await fetch(
		`${API_BASE}/api/v1/query?query=${encodeURIComponent(promql)}`
	);
	const json = await res.json();
	return json?.data?.result ?? [];
};

const queryRange = async (
	promql: string,
	start: number,
	end: number,
	step = "30s"
): Promise<PrometheusResult[]> => {
	const res = await fetch(
		`${API_BASE}/api/v1/query_range?query=${encodeURIComponent(promql)}&start=${start}&end=${end}&step=${step}`
	);
	const json = await res.json();
	return json?.data?.result ?? [];
};

interface Agent {
	key: string;
	label: string;
	icon: string;
	color: string;
}

const AGENTS: Agent[] = [
	{ key: "location_parser", label: "Location Parser", icon: "📍", color: "#6366f1" },
	{ key: "personalization", label: "Personalization", icon: "👤", color: "#8b5cf6" },
	{ key: "intent_parser", label: "Intent Parser", icon: "🧠", color: "#a78bfa" },
	{ key: "venue_scout", label: "Venue Scout", icon: "🔍", color: "#3b82f6" },
	{ key: "tavily_research", label: "Tavily Research", icon: "🌐", color: "#06b6d4" },
	{ key: "research_summary", label: "Research Summary", icon: "📝", color: "#10b981" },
	{ key: "routing", label: "Routing", icon: "🗺️", color: "#f59e0b" },
	{ key: "adventure_creator", label: "Adventure Creator", icon: "✨", color: "#ef4444" },
];

interface DashboardData {
	totalCalls: number;
	avgWorkflow: number;
	agentDurations: Record<string, number>;    // all-time average
	agentCalls: Record<string, number>;
	latestAgentDurations: Record<string, number>; // last 1h average (proxy for recent)
	sparkValues: number[];
	errorCount: number;
	slowestAgent: Agent;
}

function Spinner() {
	return (
		<div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
			<div style={{
				width: 32, height: 32, border: "3px solid #334155",
				borderTop: "3px solid #6366f1", borderRadius: "50%",
				animation: "spin 0.8s linear infinite"
			}} />
			<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
		</div>
	);
}

interface StatCardProps {
	icon: string;
	label: string;
	value: number | string;
	sub?: string;
	color?: string;
}

function StatCard({ icon, label, value, sub, color = "#6366f1" }: StatCardProps) {
	return (
		<div style={{
			background: "#1e293b", borderRadius: 12, padding: "20px 24px",
			borderTop: `3px solid ${color}`, flex: 1, minWidth: 140
		}}>
			<div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
			<div style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9" }}>{value ?? "—"}</div>
			<div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{label}</div>
			{sub && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{sub}</div>}
		</div>
	);
}

interface AgentBarProps {
	agent: Agent;
	duration: number;
	maxDuration: number;
	calls: number;
	showCalls: boolean;
}

function AgentBar({ agent, duration, maxDuration, calls, showCalls }: AgentBarProps) {
	const pct = maxDuration > 0 ? (duration / maxDuration) * 100 : 0;
	return (
		<div style={{ marginBottom: 14 }}>
			<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
				<span style={{ color: "#cbd5e1", fontSize: 14 }}>
					{agent.icon} {agent.label}
				</span>
				<span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14 }}>
					{duration > 0 ? `${duration.toFixed(2)}s` : "no data"}
					{showCalls && calls > 0 && (
						<span style={{ color: "#64748b", fontWeight: 400, marginLeft: 8 }}>
							({calls} calls)
						</span>
					)}
				</span>
			</div>
			<div style={{ background: "#0f172a", borderRadius: 6, height: 10, overflow: "hidden" }}>
				<div style={{
					height: "100%", width: `${pct}%`, borderRadius: 6,
					background: agent.color, transition: "width 0.6s ease"
				}} />
			</div>
		</div>
	);
}

interface SparklineProps {
	values: number[];
	color: string;
}

function MiniSparkline({ values, color }: SparklineProps) {
	if (!values || values.length < 2) {
		return <span style={{ color: "#475569", fontSize: 12 }}>no data</span>;
	}
	const max = Math.max(...values);
	const min = Math.min(...values);
	const range = max - min || 1;
	const w = 120, h = 36;
	const pts = values.map((v, i) => {
		const x = (i / (values.length - 1)) * w;
		const y = h - ((v - min) / range) * (h - 4) - 2;
		return `${x},${y}`;
	}).join(" ");
	return (
		<svg width={w} height={h} style={{ display: "block" }}>
			<polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
		</svg>
	);
}

export default function ObservabilityPage() {
	const [data, setData] = useState<DashboardData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
	const [tab, setTab] = useState("overview");
	const [agentView, setAgentView] = useState<"average" | "latest">("average");

	const fetchAll = useCallback(async () => {
		try {
			setError(null);
			const now = Math.floor(Date.now() / 1000);
			const oneHourAgo = now - 3600;

			// Total workflow runs — sum across all label variants
			const totalCalls = await query('sum(llm_traces_span_metrics_calls_total{span_name="miniquest.generate_adventures"})');
			const totalCallsVal = totalCalls.length > 0 ? parseFloat(totalCalls[0].value[1]) : 0;

			// All-time average per agent
			const agentDurations: Record<string, number> = {};
			const agentCalls: Record<string, number> = {};
			for (const agent of AGENTS) {
				const spanName = `miniquest.agent.${agent.key}`;
				const durRes = await query(`sum(llm_traces_span_metrics_duration_milliseconds_sum{span_name="${spanName}"})`);
				const cntRes = await query(`sum(llm_traces_span_metrics_calls_total{span_name="${spanName}"})`);
				const s = durRes.length > 0 ? parseFloat(durRes[0].value[1]) : 0;
				const c = cntRes.length > 0 ? parseFloat(cntRes[0].value[1]) : 0;
				agentDurations[agent.key] = c > 0 ? (s / c) / 1000 : 0;
				agentCalls[agent.key] = c;
			}

			// Latest run — increase() over last 2 hours (wide enough to always catch last run)
			const latestAgentDurations: Record<string, number> = {};
			for (const agent of AGENTS) {
				const spanName = `miniquest.agent.${agent.key}`;
				// increase() gives the delta of the counter over the window
				const durRes = await query(`sum(increase(llm_traces_span_metrics_duration_milliseconds_sum{span_name="${spanName}"}[2h]))`);
				const cntRes = await query(`sum(increase(llm_traces_span_metrics_calls_total{span_name="${spanName}"}[2h]))`);
				const s = durRes.length > 0 ? parseFloat(durRes[0].value[1]) : 0;
				const c = cntRes.length > 0 ? parseFloat(cntRes[0].value[1]) : 0;
				// Divide by calls in window to get per-call average for recent runs
				latestAgentDurations[agent.key] = c > 0 ? (s / c) / 1000 : 0;
			}

			// Overall workflow avg
			const wfDur = await query('sum(llm_traces_span_metrics_duration_milliseconds_sum{span_name="miniquest.generate_adventures"})');
			const wfCnt = await query('sum(llm_traces_span_metrics_calls_total{span_name="miniquest.generate_adventures"})');
			const wfSum = wfDur.length > 0 ? parseFloat(wfDur[0].value[1]) : 0;
			const wfCntVal = wfCnt.length > 0 ? parseFloat(wfCnt[0].value[1]) : 0;
			const avgWorkflow = wfCntVal > 0 ? (wfSum / wfCntVal) / 1000 : 0;

			// Throughput sparkline
			const rateRange = await queryRange(
				'sum(rate(llm_traces_span_metrics_calls_total{span_name="miniquest.generate_adventures"}[5m]))',
				oneHourAgo, now, "120s"
			);
			const sparkValues = rateRange.length > 0
				? rateRange[0].values?.map(([, v]) => parseFloat(v)) ?? []
				: [];

			// Error count
			const errorResult = await query('sum(llm_traces_span_metrics_calls_total{span_name="miniquest.generate_adventures",status_code!="STATUS_CODE_OK"}) or vector(0)');
			const errorCount = errorResult.length > 0 ? parseFloat(errorResult[0].value[1]) : 0;

			const slowestAgent = AGENTS.reduce((best, a) =>
				(agentDurations[a.key] ?? 0) > (agentDurations[best.key] ?? 0) ? a : best, AGENTS[0]);

			setData({
				totalCalls: totalCallsVal, avgWorkflow,
				agentDurations, agentCalls, latestAgentDurations,
				sparkValues, errorCount, slowestAgent
			});
			setLastRefresh(new Date());
		} catch {
			setError("Could not reach Prometheus. Make sure the Prove AI pipeline is running and you've sent at least one MiniQuest request.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchAll();
		const interval = setInterval(fetchAll, 30000);
		return () => clearInterval(interval);
	}, [fetchAll]);

	const tabs = [
		{ key: "overview", label: "📋 Overview" },
		{ key: "agents", label: "🤖 Agent Breakdown" },
		{ key: "throughput", label: "📈 Throughput" },
	];

	return (
		<div style={{
			background: "#0f172a", minHeight: "100vh", padding: "32px 24px",
			fontFamily: "'Inter', system-ui, sans-serif", color: "#f1f5f9"
		}}>
			{/* Header */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
				<div>
					<h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: "#f1f5f9" }}>
						🔭 MiniQuest Observability
					</h1>
					<p style={{ color: "#64748b", margin: "6px 0 0", fontSize: 14 }}>
						Powered by Prove AI · Prometheus · VictoriaMetrics
					</p>
				</div>
				<div style={{ textAlign: "right" }}>
					<button onClick={fetchAll} style={{
						background: "#1e293b", color: "#94a3b8", border: "1px solid #334155",
						borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13
					}}>↻ Refresh</button>
					{lastRefresh && (
						<div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>
							Updated {lastRefresh.toLocaleTimeString()}
						</div>
					)}
				</div>
			</div>

			{/* Tabs */}
			<div style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid #1e293b" }}>
				{tabs.map(t => (
					<button key={t.key} onClick={() => setTab(t.key)} style={{
						background: tab === t.key ? "#6366f1" : "transparent",
						color: tab === t.key ? "white" : "#64748b",
						border: "none", padding: "10px 18px", borderRadius: "8px 8px 0 0",
						cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "all 0.2s"
					}}>{t.label}</button>
				))}
			</div>

			{loading && <Spinner />}

			{error && (
				<div style={{
					background: "#1e293b", border: "1px solid #ef4444", borderRadius: 12,
					padding: 24, color: "#fca5a5", fontSize: 14, lineHeight: 1.6
				}}>
					⚠️ {error}
				</div>
			)}

			{!loading && !error && data && (
				<>
					{/* ── Overview ── */}
					{tab === "overview" && (
						<>
							<div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
								<StatCard icon="🚀" label="Total Workflow Runs" value={Math.round(data.totalCalls)} color="#6366f1" />
								<StatCard
									icon="⏱️" label="Avg Workflow Duration"
									value={data.avgWorkflow > 0 ? `${data.avgWorkflow.toFixed(1)}s` : "—"}
									sub="end-to-end per request" color="#10b981"
								/>
								<StatCard
									icon="🐌" label="Slowest Agent"
									value={data.slowestAgent?.icon ?? "—"}
									sub={data.slowestAgent?.label} color="#f59e0b"
								/>
								<StatCard icon="❌" label="Error Spans" value={Math.round(data.errorCount)} color="#ef4444" />
							</div>

							<div style={{ background: "#1e293b", borderRadius: 12, padding: 24, marginBottom: 24 }}>
								<h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px", color: "#e2e8f0" }}>
									🔗 Pipeline Flow
								</h2>
								<div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
									{AGENTS.map((agent, i) => {
										const dur = data.agentDurations[agent.key] ?? 0;
										return (
											<div key={agent.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
												<div style={{
													background: "#0f172a", border: `2px solid ${agent.color}`,
													borderRadius: 8, padding: "8px 12px", textAlign: "center", minWidth: 80
												}}>
													<div style={{ fontSize: 16 }}>{agent.icon}</div>
													<div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{agent.label.split(" ")[0]}</div>
													<div style={{ fontSize: 12, color: agent.color, fontWeight: 700, marginTop: 2 }}>
														{dur > 0 ? `${dur.toFixed(2)}s` : "—"}
													</div>
												</div>
												{i < AGENTS.length - 1 && (
													<div style={{ color: "#334155", fontSize: 18 }}>→</div>
												)}
											</div>
										);
									})}
								</div>
							</div>
						</>
					)}

					{/* ── Agent Breakdown ── */}
					{tab === "agents" && (
						<div style={{ background: "#1e293b", borderRadius: 12, padding: 24 }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
								<h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#e2e8f0" }}>
									🤖 Agent Latency Breakdown
								</h2>
								{/* Toggle */}
								<div style={{ display: "flex", background: "#0f172a", borderRadius: 8, padding: 3, gap: 3 }}>
									{(["average", "latest"] as const).map(v => (
										<button key={v} onClick={() => setAgentView(v)} style={{
											padding: "6px 14px", borderRadius: 6, border: "none",
											background: agentView === v ? "#6366f1" : "transparent",
											color: agentView === v ? "white" : "#64748b",
											fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s"
										}}>
											{v === "average" ? "⌀ All-time Avg" : "⚡ Last 2h Avg"}
										</button>
									))}
								</div>
							</div>
							<p style={{ color: "#64748b", fontSize: 13, margin: "0 0 24px" }}>
								{agentView === "average"
									? "Average duration per agent across all recorded runs."
									: "Average duration per agent over the last 2 hours — reflects your most recent requests."}
							</p>
							{(() => {
								const durations = agentView === "average" ? data.agentDurations : data.latestAgentDurations;
								const maxDur = Math.max(...AGENTS.map(a => durations[a.key] ?? 0));
								return AGENTS.map(agent => (
									<AgentBar
										key={agent.key}
										agent={agent}
										duration={durations[agent.key] ?? 0}
										maxDuration={maxDur}
										calls={data.agentCalls[agent.key] ?? 0}
										showCalls={agentView === "average"}
									/>
								));
							})()}
							<div style={{
								marginTop: 24, padding: "16px 20px", background: "#0f172a",
								borderRadius: 10, border: "1px solid #334155"
							}}>
								<div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8 }}>💡 Reading this chart</div>
								<div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>
									{agentView === "average"
										? "Tavily Research runs in parallel across all venues, so its bar represents the longest single venue research time. Adventure Creator includes GPT-4o inference + Google Maps route optimization per adventure."
										: "Last 2h Avg uses only spans from the past 2 hours, so it reflects your most recent requests. Switch to All-time Avg to compare against the full history."}
								</div>
							</div>
						</div>
					)}

					{/* ── Throughput ── */}
					{tab === "throughput" && (
						<div style={{ background: "#1e293b", borderRadius: 12, padding: 24 }}>
							<h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px", color: "#e2e8f0" }}>
								📈 Request Rate (last hour)
							</h2>
							<p style={{ color: "#64748b", fontSize: 13, margin: "0 0 24px" }}>
								5-minute rolling rate of completed workflow runs.
							</p>
							<div style={{ marginBottom: 24 }}>
								<MiniSparkline values={data.sparkValues} color="#6366f1" />
								{data.sparkValues.length === 0 && (
									<div style={{ color: "#475569", fontSize: 13, marginTop: 8 }}>
										No throughput data yet — send a few requests to MiniQuest first.
									</div>
								)}
							</div>
							<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
								{AGENTS.map(agent => (
									<div key={agent.key} style={{
										background: "#0f172a", borderRadius: 10, padding: "14px 16px",
										display: "flex", justifyContent: "space-between", alignItems: "center"
									}}>
										<span style={{ fontSize: 13, color: "#94a3b8" }}>{agent.icon} {agent.label}</span>
										<span style={{ fontWeight: 700, color: agent.color, fontSize: 14 }}>
											{(data.agentCalls[agent.key] ?? 0) > 0 ? `${data.agentCalls[agent.key]} calls` : "—"}
										</span>
									</div>
								))}
							</div>
						</div>
					)}
				</>
			)}

			<div style={{ marginTop: 32, color: "#334155", fontSize: 12, textAlign: "center" }}>
				Auto-refreshes every 30s · Prometheus via Vite proxy · Data stored in VictoriaMetrics (12 months)
			</div>
		</div>
	);
}