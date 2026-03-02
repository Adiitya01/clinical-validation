import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, Shield, Search, BarChart3 } from 'lucide-react';

const ProgressTracker = ({ status }) => {
    const isFailed = status.startsWith('FAILED');

    const getStepStatus = (stepKey) => {
        const order = ['UPLOADING', 'VALIDATING', 'VERIFYING', 'SCORING', 'COMPLETED'];
        const currentIdx = order.indexOf(status);
        const stepIdx = order.indexOf(stepKey);

        if (isFailed) return 'failed';
        if (stepIdx < currentIdx) return 'completed';
        if (stepIdx === currentIdx) return 'active';
        return 'pending';
    };

    const steps = [
        { key: 'UPLOADING', name: 'Upload', icon: Shield, desc: 'Files received' },
        { key: 'VALIDATING', name: 'Analysis', icon: Search, desc: 'Clause-level compliance audit' },
        { key: 'VERIFYING', name: 'Verification', icon: CheckCircle2, desc: 'Self-consistency check' },
        { key: 'SCORING', name: 'Scoring', icon: BarChart3, desc: 'Accuracy & risk scoring' },
    ];

    return (
        <div className="w-full flex flex-col items-center">
            {/* Step progress */}
            <div className="flex justify-between items-start w-full max-w-lg relative mb-12">
                {/* Connecting line */}
                <div className="absolute top-4 left-8 right-8 h-0.5 bg-slate-100 -z-10"></div>
                <div
                    className="absolute top-4 left-8 h-0.5 bg-blue-500 -z-10 transition-all duration-700"
                    style={{
                        width: `${Math.max(0, ((['UPLOADING', 'VALIDATING', 'VERIFYING', 'SCORING', 'COMPLETED'].indexOf(status)) / 3) * 100)}%`,
                        maxWidth: 'calc(100% - 4rem)'
                    }}
                ></div>

                {steps.map((step, idx) => {
                    const stepStatus = getStepStatus(step.key);
                    const Icon = step.icon;
                    return (
                        <div key={idx} className="flex flex-col items-center w-24">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${stepStatus === 'completed' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' :
                                    stepStatus === 'active' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 animate-pulse' :
                                        stepStatus === 'failed' ? 'bg-red-500 text-white' :
                                            'bg-white border-2 border-slate-200 text-slate-300'
                                }`}>
                                {stepStatus === 'completed' ? <CheckCircle2 size={16} /> :
                                    stepStatus === 'active' ? <Loader2 size={16} className="animate-spin" /> :
                                        <Icon size={14} />}
                            </div>
                            <span className={`text-[10px] mt-2 font-bold uppercase tracking-wider text-center ${stepStatus === 'active' ? 'text-blue-600' :
                                    stepStatus === 'completed' ? 'text-emerald-600' : 'text-slate-400'
                                }`}>
                                {step.name}
                            </span>
                            <span className="text-[9px] text-slate-400 mt-0.5 text-center leading-tight">
                                {step.desc}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Active status message */}
            <div className="text-center space-y-4">
                {!isFailed && status !== 'COMPLETED' && (
                    <>
                        <div className="relative">
                            <Loader2 className="animate-spin text-blue-600 mx-auto" size={36} />
                            <div className="absolute inset-0 bg-blue-400 blur-2xl opacity-10 animate-pulse"></div>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-slate-900">
                                {status === 'VALIDATING' && 'Performing clause-level compliance audit...'}
                                {status === 'VERIFYING' && 'Running self-consistency verification...'}
                                {status === 'SCORING' && 'Calculating accuracy and risk scores...'}
                                {status === 'UPLOADING' && 'Uploading documents to analysis engine...'}
                                {status === 'PROCESSING' && 'Processing documents...'}
                            </h3>
                            <p className="text-sm text-slate-500">
                                This typically takes 30-90 seconds depending on document length.
                            </p>
                        </div>
                    </>
                )}

                {isFailed && (
                    <div className="bg-red-50 p-6 rounded-2xl border border-red-100 text-center space-y-2 max-w-md">
                        <AlertCircle className="text-red-500 mx-auto" size={32} />
                        <h3 className="text-red-900 font-bold">Analysis Failed</h3>
                        <p className="text-red-600 text-sm">{status.replace('FAILED: ', '')}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                        >
                            TRY AGAIN
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProgressTracker;
