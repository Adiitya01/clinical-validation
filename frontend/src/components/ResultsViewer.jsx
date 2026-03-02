import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, ArrowUpRight, ShieldCheck, FileText, BarChart3, TrendingUp, AlertTriangle, Eye } from 'lucide-react';

const StatusBadge = ({ status }) => {
    const styles = {
        'Compliant': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'Non-Compliant': 'bg-red-50 text-red-700 border-red-200',
        'Partial': 'bg-amber-50 text-amber-700 border-amber-200',
        'Observation': 'bg-blue-50 text-blue-700 border-blue-200',
        'Not Applicable': 'bg-slate-50 text-slate-500 border-slate-200',
    };
    const icons = {
        'Compliant': <CheckCircle2 size={14} />,
        'Non-Compliant': <AlertCircle size={14} />,
        'Partial': <AlertTriangle size={14} />,
        'Observation': <Eye size={14} />,
        'Not Applicable': <Info size={14} />,
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${styles[status] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
            {icons[status]} {status}
        </span>
    );
};

const SeverityBadge = ({ severity }) => {
    if (!severity || severity === 'N/A') return <span className="text-slate-300 text-xs">-</span>;
    const styles = {
        'Critical': 'bg-red-600 text-white',
        'Major': 'bg-orange-500 text-white',
        'Minor': 'bg-yellow-400 text-yellow-900',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${styles[severity] || 'bg-slate-200 text-slate-600'}`}>
            {severity}
        </span>
    );
};

const ResultsViewer = ({ results }) => {
    if (!results) return null;

    const data = results.results;
    const risk = data.risk_summary || {};
    const pipeline = results.pipeline || {};
    const accuracy = pipeline.accuracy_breakdown || {};
    const corrections = pipeline.corrections || [];

    return (
        <div className="w-full max-w-7xl space-y-8">

            {/* ── Top Score Cards ──────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Compliance Score */}
                <div className="bg-slate-900 p-8 rounded-3xl text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute -top-4 -right-4 opacity-5">
                        <ShieldCheck size={140} />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-1">Compliance</p>
                    <h3 className="text-6xl font-black">{data.compliance_score ?? 'N/A'}<span className="text-blue-400 text-3xl">%</span></h3>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full mt-4 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${data.compliance_score || 0}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 mt-3">{data.total_clauses_reviewed || data.findings?.length || 0} clauses reviewed</p>
                </div>

                {/* Accuracy Score */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 opacity-5">
                        <BarChart3 size={140} className="text-slate-900" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-1">Accuracy</p>
                    <h3 className="text-6xl font-black text-slate-900">{results.accuracy_score ?? 'N/A'}<span className="text-emerald-500 text-3xl">%</span></h3>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${results.accuracy_score || 0}%` }} />
                    </div>
                    <p className="text-xs text-slate-400 mt-3">Multi-factor quality assessment</p>
                </div>

                {/* Risk Distribution */}
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-4">Risk Distribution</p>
                    <div className="space-y-3">
                        {[
                            { label: 'Critical', count: risk.critical || 0, color: 'bg-red-500', textColor: 'text-red-600' },
                            { label: 'Major', count: risk.major || 0, color: 'bg-orange-500', textColor: 'text-orange-600' },
                            { label: 'Minor', count: risk.minor || 0, color: 'bg-yellow-400', textColor: 'text-yellow-600' },
                            { label: 'Observations', count: risk.observations || 0, color: 'bg-blue-400', textColor: 'text-blue-600' },
                        ].map(({ label, count, color, textColor }) => (
                            <div key={label} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${color}`} />
                                    <span className="text-xs font-medium text-slate-600">{label}</span>
                                </div>
                                <span className={`text-lg font-black ${textColor}`}>{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Executive Summary ────────────────────────────────── */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-100 p-2 rounded-lg">
                        <FileText size={18} className="text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Executive Summary</h3>
                        <p className="text-xs text-slate-400">{results.document_name} to {results.guideline_name}</p>
                    </div>
                </div>
                <p className="text-slate-600 leading-relaxed text-sm">{data.executive_summary}</p>
            </div>

            {/* ── Findings Table ───────────────────────────────────── */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-900">Clause-Level Findings</h3>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {data.findings?.length || 0} FINDINGS
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                {['Clause', 'Status', 'Severity', 'Description', 'Recommendation'].map(h => (
                                    <th key={h} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {(data.findings || []).map((finding, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-5 align-top">
                                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                            {finding.clause}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 align-top">
                                        <StatusBadge status={finding.status} />
                                    </td>
                                    <td className="px-6 py-5 align-top">
                                        <SeverityBadge severity={finding.severity} />
                                    </td>
                                    <td className="px-6 py-5 align-top">
                                        <p className="text-sm text-slate-700 leading-relaxed max-w-sm">{finding.description}</p>
                                        {finding.evidence && (
                                            <p className="text-[11px] text-slate-400 mt-2 italic border-l-2 border-slate-200 pl-3">
                                                Evidence: {finding.evidence}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 align-top">
                                        {finding.recommendation ? (
                                            <div className="flex items-start gap-2">
                                                <ArrowUpRight className="text-slate-300 mt-0.5 shrink-0" size={14} />
                                                <p className="text-sm text-slate-500">{finding.recommendation}</p>
                                            </div>
                                        ) : (
                                            <span className="text-slate-300 text-xs">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Accuracy Breakdown (collapsible detail) ──────────── */}
            {accuracy.breakdown && (
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-emerald-100 p-2 rounded-lg">
                            <TrendingUp size={18} className="text-emerald-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Accuracy Breakdown</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {Object.entries(accuracy.breakdown).map(([key, value]) => (
                            <div key={key} className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                    {key.replace(/_/g, ' ')}
                                </p>
                                <p className="text-2xl font-black text-slate-900">{value}<span className="text-sm text-slate-400">%</span></p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Pipeline Corrections ─────────────────────────────── */}
            {corrections.length > 0 && (
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                    <h4 className="text-sm font-bold text-amber-800 uppercase tracking-wider mb-3">
                        {corrections.length} Auto-Corrections Applied
                    </h4>
                    <ul className="space-y-1">
                        {corrections.map((c, i) => (
                            <li key={i} className="text-xs text-amber-700 flex items-start gap-2">
                                <span className="text-amber-400 mt-0.5">-</span> {c}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ResultsViewer;
