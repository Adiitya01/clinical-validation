import React from 'react';
import { Download, FileDown } from 'lucide-react';
import client from '../api/client';

const ReportDownload = ({ sessionId }) => {
    const handleDownload = () => {
        window.location.href = client.getDownloadUrl(sessionId);
    };

    return (
        <div className="flex flex-col items-center space-y-4">
            <button
                onClick={handleDownload}
                className="group relative flex items-center space-x-3 bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold transition-all hover:bg-slate-800 shadow-xl hover:shadow-slate-200 active:scale-95"
            >
                <div className="bg-blue-500 p-2 rounded-lg group-hover:scale-110 transition-transform">
                    <FileDown size={20} className="text-white" />
                </div>
                <div className="text-left">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-widest leading-none mb-1">Download</p>
                    <p className="text-sm">Audit Compliance Report (.docx)</p>
                </div>
            </button>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Formalized Regulatory Template v2.4</p>
        </div>
    );
};

export default ReportDownload;
