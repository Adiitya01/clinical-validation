import React, { useState } from 'react';
import { Upload, FileText, Shield, CheckCircle, Plus, Trash2, Play, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const UploadPanel = ({ onStartBatch }) => {
    const [document, setDocument] = useState(null);
    const [guidelines, setGuidelines] = useState([]);
    const [queue, setQueue] = useState([]);

    const handleGuidelineChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            // Append new selections to existing ones, or replace? 
            // Usually replace is standard for file inputs, but for "adding" multiple might be better to append.
            // Let's replace for simplicity to avoid duplicates, user can select multiple at once.
            setGuidelines(Array.from(e.target.files));
        }
    };

    const addToBatch = () => {
        if (!document || guidelines.length === 0) return;

        // Create a queue item for EACH guideline against the SINGLE document
        const newItems = guidelines.map(gui => ({
            id: Math.random().toString(36).substr(2, 9),
            document: document,
            guideline: gui,
            docName: document.name,
            guiName: gui.name
        }));

        setQueue((prev) => [...prev, ...newItems]);

        // Reset inputs for next batch
        setDocument(null);
        setGuidelines([]);
    };

    const removeItem = (id) => {
        setQueue(queue.filter(item => item.id !== id));
    };

    return (
        <div className="w-full max-w-6xl space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-10 rounded-3xl border border-slate-200 shadow-xl w-full"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold text-slate-900">Document Selection</h3>
                            <p className="text-sm text-slate-500">Attach clinical protocols and target guidelines.</p>
                        </div>

                        <div className="space-y-4">
                            {/* Document Input (Single) */}
                            <div className="relative group">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Clinical/Safety Protocol (Single File)</label>
                                <label className={`flex items-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${document ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200 hover:border-blue-400 hover:bg-white'
                                    }`}>
                                    <div className={`p-2 rounded-lg mr-4 ${document ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                                        {document ? <CheckCircle size={20} /> : <FileText size={20} />}
                                    </div>
                                    <div className="flex-grow overflow-hidden">
                                        <p className={`text-sm font-semibold truncate ${document ? 'text-blue-900' : 'text-slate-500'}`}>
                                            {document ? document.name : 'Select Clinical Document'}
                                        </p>
                                        {!document && <p className="text-[10px] text-slate-400 uppercase tracking-tighter">MAX 50MB | PDF, DOCX, DOC</p>}
                                    </div>
                                    <input type="file" className="hidden" accept=".pdf,.docx,.doc,.dcx" onChange={(e) => setDocument(e.target.files[0])} />
                                </label>
                            </div>

                            {/* Guideline Input (Multiple) */}
                            <div className="relative group">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Regulatory Guidelines (Multiple Allowed)</label>
                                <label className={`flex items-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${guidelines.length > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:border-emerald-400 hover:bg-white'
                                    }`}>
                                    <div className={`p-2 rounded-lg mr-4 ${guidelines.length > 0 ? 'bg-emerald-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                                        {guidelines.length > 0 ? <Layers size={20} /> : <Shield size={20} />}
                                    </div>
                                    <div className="flex-grow overflow-hidden">
                                        <p className={`text-sm font-semibold truncate ${guidelines.length > 0 ? 'text-emerald-900' : 'text-slate-500'}`}>
                                            {guidelines.length > 0
                                                ? `${guidelines.length} Guideline${guidelines.length > 1 ? 's' : ''} Selected`
                                                : 'Select Regulatory Guidelines'}
                                        </p>
                                        {guidelines.length > 0 ? (
                                            <p className="text-[10px] text-emerald-600 truncate">
                                                {guidelines.map(f => f.name).join(', ')}
                                            </p>
                                        ) : (
                                            <p className="text-[10px] text-slate-400 uppercase tracking-tighter">OFFICIAL GUIDELINES PREFERRED</p>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.docx,.doc,.dcx"
                                        multiple
                                        onChange={handleGuidelineChange}
                                    />
                                </label>
                            </div>

                            <button
                                onClick={addToBatch}
                                disabled={!document || guidelines.length === 0}
                                className={`w-full py-4 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center space-x-2 ${document && guidelines.length > 0
                                    ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg'
                                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                    }`}
                            >
                                <Plus size={18} />
                                <span>
                                    ADD {guidelines.length > 1 ? `${guidelines.length} PAIRS` : 'PAIR'} TO BATCH
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-8 flex flex-col justify-between border border-slate-100">
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Batch Queue ({queue.length})</h4>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                <AnimatePresence>
                                    {queue.length === 0 ? (
                                        <div className="py-10 text-center space-y-2">
                                            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center mx-auto text-slate-400">
                                                <div className="w-1 h-1 bg-slate-400 rounded-full animate-ping" />
                                            </div>
                                            <p className="text-xs text-slate-400 font-medium italic">Your queue is empty.</p>
                                        </div>
                                    ) : (
                                        queue.map((item) => (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 10 }}
                                                className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between group"
                                            >
                                                <div className="flex flex-col min-w-0 pr-4">
                                                    <span className="text-[10px] font-bold text-blue-600 truncate">{item.docName}</span>
                                                    <span className="text-[9px] text-slate-400 truncate">vs. {item.guiName}</span>
                                                </div>
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <div className="mt-8">
                            <button
                                onClick={() => onStartBatch(queue)}
                                disabled={queue.length === 0}
                                className={`w-full py-4 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center space-x-2 ${queue.length > 0
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                <Play size={18} fill="currentColor" />
                                <span>START BATCH VALIDATION</span>
                            </button>
                            <p className="text-[10px] text-center text-slate-400 mt-4 font-medium uppercase tracking-widest">
                                High-Precision Multi-Audit Mode
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default UploadPanel;
