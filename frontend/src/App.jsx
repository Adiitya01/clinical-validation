import React, { useState, useEffect } from 'react';
import UploadPanel from './components/UploadPanel';
import ProgressTracker from './components/ProgressTracker';
import ResultsViewer from './components/ResultsViewer';
import ReportDownload from './components/ReportDownload';
import client from './api/client';
import { FileSearch, ChevronLeft, ChevronRight, Layers } from 'lucide-react';

function App() {
  const [batch, setBatch] = useState([]); // [{ sessionId, docName, guiName, status, results }]
  const [appStatus, setAppStatus] = useState('IDLE'); // 'IDLE', 'PROCESSING', 'COMPLETED'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [view, setView] = useState('HOME');

  const startBatchValidation = async (queue) => {
    setAppStatus('PROCESSING');

    // Initialize batch state
    const initialBatch = queue.map(item => ({
      docName: item.docName,
      guiName: item.guiName,
      status: 'WAITING',
      results: null,
      sessionId: null,
      files: { doc: item.document, gui: item.guideline }
    }));

    setBatch(initialBatch);

    // Process each item in sequence (or could do parallel, but sequential is safer for rate limits)
    for (let i = 0; i < initialBatch.length; i++) {
      try {
        updateItemStatus(i, { status: 'UPLOADING' });
        const { doc, gui } = initialBatch[i].files;
        const uploadData = await client.uploadFiles(doc, gui);

        updateItemStatus(i, {
          sessionId: uploadData.session_id,
          status: 'VALIDATING'
        });

        await client.startPipeline(uploadData.session_id);

        // Watch status via WebSocket
        await watchItemStatus(i, uploadData.session_id);

      } catch (error) {
        console.error(error);
        updateItemStatus(i, { status: 'FAILED: System error' });
      }
    }

    setAppStatus('COMPLETED');
  };

  const updateItemStatus = (index, updates) => {
    setBatch(prev => {
      const newBatch = [...prev];
      newBatch[index] = { ...newBatch[index], ...updates };
      return newBatch;
    });
  };

  const watchItemStatus = (index, sessionId) => {
    return new Promise((resolve) => {
      const ws = client.openStatusSocket(sessionId);

      ws.onmessage = async (event) => {
        try {
          const { type, status } = JSON.parse(event.data);
          if (type !== 'status') return;
          updateItemStatus(index, { status });

          if (status === 'COMPLETED') {
            ws.close();
            const resultsData = await client.getResults(sessionId);
            updateItemStatus(index, { results: resultsData, status: 'COMPLETED' });
            resolve();
          } else if (status.startsWith('FAILED')) {
            ws.close();
            resolve();
          }
        } catch (err) {
          console.error(err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error', err);
        ws.close();
        resolve();
      };

      ws.onclose = () => resolve();
    });
  };

  const AboutSection = () => (
    <div className="max-w-4xl w-full space-y-16 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="text-center space-y-6">
        <h2 className="text-5xl font-black text-slate-900 tracking-tight leading-tight">Precision Compliance for <br /> Clinical Research.</h2>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
          ComplianceLens is built to bridge the gap between complex regulatory requirements and document readiness.
        </p>
      </div>
      <div className="bg-slate-900 rounded-[2.5rem] p-12 text-white text-center">
        <h3 className="text-2xl font-bold mb-4">Strategic AI Implementation</h3>
        <p className="text-slate-400 mb-8">Our multi-stage pipeline ensures verifyable results for high-stakes regulatory filings.</p>
        <button onClick={() => setView('HOME')} className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl font-bold">BACK TO HOME</button>
      </div>
    </div>
  );

  const activeItem = batch[currentIndex];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => { setView('HOME'); setAppStatus('IDLE'); setBatch([]); }}>
              <div className="bg-blue-600 p-2.5 rounded-xl"><FileSearch size={22} className="text-white" /></div>
              <div className="flex flex-col"><span className="text-xl font-black text-slate-900">ComplianceLens</span><span className="text-[10px] font-bold text-blue-600">Clinical AI</span></div>
            </div>
            <div className="flex items-center space-x-8">
              <nav className="hidden md:flex items-center space-x-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <button onClick={() => setView('HOME')} className={view === 'HOME' ? 'text-blue-600' : ''}>Dashboard</button>
                <button onClick={() => setView('ABOUT')} className={view === 'ABOUT' ? 'text-blue-600' : ''}>About Us</button>
              </nav>
              <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[11px] font-bold tracking-wider uppercase">Access Portal</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col items-center">
          {view === 'ABOUT' ? <AboutSection /> : (
            <>
              {appStatus === 'IDLE' && (
                <div className="text-center mb-16 space-y-4">
                  <h1 className="text-5xl font-black text-slate-900">Batch Document Validation</h1>
                  <p className="text-xl text-slate-500">Analyze multiple document-guideline pairs in a synchronized audit pipeline.</p>
                </div>
              )}

              {appStatus === 'IDLE' && <UploadPanel onStartBatch={startBatchValidation} />}

              {(appStatus === 'PROCESSING' || (appStatus === 'COMPLETED' && batch.length > 0)) && (
                <div className="w-full space-y-10">
                  {/* Enhanced Batch Navigation Dashboard */}
                  <div className="w-full space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers size={18} className="text-blue-600" />
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Audits In This Session</h3>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                        {currentIndex + 1} / {batch.length}
                      </span>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                      {batch.map((item, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentIndex(i)}
                          className={`flex-shrink-0 w-64 p-4 rounded-2xl border transition-all duration-300 text-left relative group ${currentIndex === i
                              ? 'bg-white border-blue-500 shadow-lg shadow-blue-50ring-2 ring-blue-500/10'
                              : 'bg-white border-slate-100 hover:border-slate-300'
                            }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className={`p-1.5 rounded-lg ${item.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' :
                                item.status.startsWith('FAILED') ? 'bg-red-50 text-red-600' :
                                  item.status === 'WAITING' ? 'bg-slate-50 text-slate-300' :
                                    'bg-blue-50 text-blue-600 animate-pulse'
                              }`}>
                              <FileSearch size={16} />
                            </div>
                            {item.status === 'COMPLETED' && (
                              <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                READY
                              </div>
                            )}
                          </div>
                          <p className={`text-xs font-bold truncate ${currentIndex === i ? 'text-slate-900' : 'text-slate-600'}`}>
                            {item.docName}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5 italic">
                            vs. {item.guiName}
                          </p>

                          {currentIndex === i && (
                            <div className="absolute -bottom-1 left-4 right-4 h-1 bg-blue-500 rounded-full" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Item View */}
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-6 text-center">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Evaluating Pair</h4>
                      <p className="text-lg font-bold text-slate-900 truncate max-w-2xl mx-auto">
                        {activeItem.docName} vs. {activeItem.guiName}
                      </p>
                    </div>

                    {activeItem.status !== 'COMPLETED' ? (
                      <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-xl w-full max-w-3xl mx-auto">
                        <ProgressTracker status={activeItem.status} />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-12">
                        <ResultsViewer results={activeItem.results} />
                        <div className="flex flex-col items-center gap-4">
                          <ReportDownload sessionId={activeItem.sessionId} />
                          {currentIndex < batch.length - 1 && (
                            <button
                              onClick={() => setCurrentIndex(currentIndex + 1)}
                              className="text-blue-600 text-sm font-bold flex items-center gap-2 hover:underline"
                            >
                              NEXT DOCUMENT <ChevronRight size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {appStatus === 'COMPLETED' && (
                    <div className="flex justify-center pt-8">
                      <button
                        onClick={() => { setAppStatus('IDLE'); setBatch([]); setView('HOME'); }}
                        className="text-slate-400 hover:text-slate-600 text-sm font-semibold underline underline-offset-4"
                      >
                        Clear and start new batch analysis
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <span className="text-[10px] font-bold uppercase tracking-widest italic text-slate-400 opacity-60">High-Precision Batch Oversight</span>
            <div className="text-slate-400 text-[11px] font-medium tracking-wide">(c) 2026 ComplianceLens Intelligence. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
