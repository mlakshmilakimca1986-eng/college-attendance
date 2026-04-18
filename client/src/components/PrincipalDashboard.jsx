import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Save, CheckCircle2, LogOut, ShieldCheck, Lock, Send, Loader2, CloudUpload, Eye, Download } from 'lucide-react';
import axios from 'axios';
import Modal from './Modal';
import debounce from 'lodash/debounce';

const STREAMS = {
  "INCOMING SENIORS": [
    "Super60(N)", "Super60(S)", "Elite(C-120)", "S60(Star)", "C120(Star)", 
    "JEE Apex", "MPL-ELITE", "AIIMS S60", "NEET Wisdom", "Sr.ELITE & AS60 (Star)"
  ],
  "OUTGOING SENIORS": [
    "Super60(N)", "Super60(S)", "Elite(C-120)", "S60(Star)", "C120(Star)", 
    "JEE Apex (2Hrs)", "MPL-ELITE", "AIIMS S60", "NEET Wisdom (2Hrs)", "Sr.ELITE & AS60 (Star)"
  ],
  "LTC-VAIDYAH": ["LTC-VAIDYAH"],
  "CO-IPL": ["7TH CLASS", "8TH CLASS", "9TH CLASS", "10TH CLASS"]
};

export default function PrincipalDashboard() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState({});
  const [isFinalized, setIsFinalized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [reportModal, setReportModal] = useState({ isOpen: false });

  useEffect(() => {
    fetchTodayData();
  }, [date]);

  const fetchTodayData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}/api/attendance/get?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const initialData = {};
      Object.keys(STREAMS).forEach(stream => {
        STREAMS[stream].forEach(sect => {
          const key = `${stream}|${sect}`;
          const existing = res.data.find(r => r.stream === sect && r.branch === stream);
          
          // Treat 1, "1", or true as finalized
          const isLocked = existing && (
            existing.finalized === 1 || 
            existing.finalized === true || 
            existing.finalized === "1" ||
            existing.finalized > 0
          );

          initialData[key] = { 
            strength: existing ? existing.strength : '', 
            present: existing ? existing.present : '',
            finalized: !!isLocked
          };
        });
      });
      setData(initialData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // AUTO-SAVE LOGIC
  const autoSave = useCallback(
    debounce(async (currentData, currentDate) => {
      setIsSaving(true);
      try {
        const token = localStorage.getItem('token');
        const formattedData = Object.keys(currentData).map(key => {
          const [branch, stream] = key.split('|');
          return { branch, stream, strength: currentData[key].strength, present: currentData[key].present };
        });

        await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}/api/attendance/save`, {
          date: currentDate,
          data: formattedData,
          finalize: false
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Auto-save failed', err);
      } finally {
        setTimeout(() => setIsSaving(false), 800);
      }
    }, 1500),
    [isFinalized]
  );

  const handleInputChange = (id, field, value) => {
    if (isFinalized) return;
    const newData = { ...data, [id]: { ...data[id], [field]: value } };
    setData(newData);
    autoSave(newData, date);
  };

  const showModal = (title, message, type = 'info') => {
    setModal({ isOpen: true, title, message, type });
  };

  const finalizeReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const formattedData = Object.keys(data).map(key => {
        const [branch, stream] = key.split('|');
        return { branch, stream, strength: data[key].strength, present: data[key].present };
      });

      await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}/api/attendance/save`, {
        date,
        data: formattedData,
        finalize: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Optimistically update local state to lock rows
      const newData = { ...data };
      Object.keys(newData).forEach(k => {
        if (newData[k].strength || newData[k].present) {
          newData[k].finalized = true;
        }
      });
      setData(newData);
      showModal('Submitted', 'Entries with data have been locked. You can still fill remaining empty sections.', 'success');
    } catch (err) {
      showModal('Action Denied', err.response?.data || 'Finalize failed.', 'error');
    }
  };

  const calculateTotal = (field) => {
    return Object.values(data).reduce((sum, item) => sum + (parseInt(item[field]) || 0), 0);
  };

  const getStatusColor = (pct) => {
    const p = parseFloat(pct);
    if (p < 75) return '#ef4444'; // Red
    if (p < 85) return '#f59e0b'; // Orange
    if (p < 95) return '#10b981'; // Light Green
    return '#059669'; // Dark Green
  };

  const getPercentage = (p, s) => {
    if (!s || s === 0) return 0;
    return ((p / s) * 100).toFixed(1);
  };

  const formatDate = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}-${m}-${y}`;
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('report-content');
    const opt = {
      margin: [3, 5, 3, 5],
      filename: `${formatDate(date)}_${localStorage.getItem('name') || 'CAMPUS'}_COLLEGE ATTENDANCE.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    window.html2pdf().from(element).set(opt).save();
  };

  const Logout = () => {
    localStorage.clear();
    window.location.reload();
  };

  // if (loading) return ...  Removed for better performance UX

  return (
    <div className="dashboard-container">
      {loading && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="glass-card" style={{ padding: '2rem 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div className="loader-bar"><div className="loader-progress"></div></div>
            <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '1px' }}>RETRIEVING DATA...</p>
          </div>
        </div>
      )}
      <header className="glass-card header-card">
        <div className="brand-section">
          <div className="logo-container">
            <img src="/logo.png" alt="Logo" />
          </div>
          <div>
            <h1>Daily Attendance</h1>
            <p className="subtitle">School: <strong>{localStorage.getItem('name')}</strong></p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          {isSaving && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6366f1', fontSize: '0.75rem', fontWeight: 800 }}><CloudUpload size={16} className="animate-bounce" /> Savings...</div>}
          <div className="input-wrapper" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0 12px', background: '#fff', width: '200px' }}>
            <Calendar className="icon" size={16} />
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              disabled={isFinalized}
              style={{ padding: '0.4rem', paddingLeft: '2.5rem', fontSize: '0.85rem', fontWeight: 900, border: 'none', background: 'transparent', width: '100%', position: 'relative' }}
            />
          </div>
          <button onClick={() => setReportModal({ isOpen: true })} className="btn btn-ghost" style={{ gap: '0.4rem', background: '#f5f3ff', color: '#6d28d9', fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
            <Eye size={16} /> Preview
          </button>
          <button onClick={finalizeReport} className="btn btn-primary" style={{ gap: '0.4rem', fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
            <Send size={16} /> Finalize
          </button>
          <button onClick={Logout} className="btn btn-ghost" style={{ gap: '0.4rem', border: 'none', color: '#be123c', background: '#fff1f2', fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
        <div className="glass-card" style={{ padding: '0.8rem 1.2rem', borderLeft: '5px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="subtitle uppercase tracking-widest text-[8px] font-bold">Total Strength</p>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>{calculateTotal('strength')}</h2>
        </div>
        <div className="glass-card" style={{ padding: '0.8rem 1.2rem', borderLeft: '5px solid #4f46e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="subtitle uppercase tracking-widest text-[8px] font-bold">Total Present</p>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a' }}>{calculateTotal('present')}</h2>
        </div>
        <div className="glass-card" style={{ padding: '0.8rem 1.2rem', borderLeft: `5px solid ${getStatusColor(getPercentage(calculateTotal('present'), calculateTotal('strength')))}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="subtitle uppercase tracking-widest text-[8px] font-bold">Total Percentage</p>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: getStatusColor(getPercentage(calculateTotal('present'), calculateTotal('strength'))) }}>
            {getPercentage(calculateTotal('present'), calculateTotal('strength'))}%
          </h2>
        </div>
      </div>

      <div className="glass-card table-container">
        {Object.values(data).some(d => d.finalized) && (
          <div style={{ background: '#f0f9ff', padding: '0.8rem 2rem', borderBottom: '1px solid #e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#0369a1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <ShieldCheck size={20} className="text-sky-500" />
              <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>OFFICIAL RECORD: Finalized entries are locked.</span>
            </div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, padding: '3px 8px', background: '#bae6fd', borderRadius: '20px', textTransform: 'uppercase' }}>Locked</div>
          </div>
        )}
        <table>
          <thead>
            <tr>
              <th>Stream / Section</th>
              <th style={{ textAlign: 'center' }}>Strength</th>
              <th style={{ textAlign: 'center' }}>Present</th>
              <th style={{ textAlign: 'center' }}>%</th>
              <th style={{ textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(STREAMS).map(stream => (
              <React.Fragment key={stream}>
                <tr>
                  <td colSpan="4" style={{ background: '#f8fafc', fontWeight: 800, color: '#6366f1', fontSize: '0.75rem' }}>{stream}</td>
                </tr>
                {STREAMS[stream].map(section => {
                  const id = `${stream}|${section}`;
                  return (
                    <tr key={id} style={{ opacity: data[id]?.finalized ? 0.7 : 1 }}>
                      <td style={{ paddingLeft: '3rem', fontWeight: 700 }}>{section}</td>
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="number" className="btn btn-ghost" style={{ width: '90px', padding: '0.4rem', textAlign: 'center', fontWeight: 900, fontSize: '1rem', color: '#0f172a' }} 
                          value={data[id]?.strength || ''} 
                          onChange={(e) => handleInputChange(id, 'strength', e.target.value)}
                          disabled={data[id]?.finalized}
                          placeholder="STR"
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="number" className="btn btn-ghost" style={{ width: '90px', padding: '0.4rem', textAlign: 'center', fontWeight: 900, fontSize: '1rem', color: '#0f172a' }} 
                          value={data[id]?.present || ''} 
                          onChange={(e) => handleInputChange(id, 'present', e.target.value)}
                          disabled={data[id]?.finalized}
                          placeholder="PRE"
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ 
                          fontWeight: 900, 
                          fontSize: '0.95rem',
                          color: getStatusColor(getPercentage(data[id]?.present, data[id]?.strength))
                        }}>
                          {getPercentage(data[id]?.present, data[id]?.strength)}%
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {data[id]?.strength && data[id]?.present ? <CheckCircle2 size={18} style={{ color: '#10b981' }} /> : <div style={{width:'8px', height:'8px', background:'#e2e8f0', borderRadius:'50%', margin:'auto'}} />}
                      </td>
                    </tr>
                  )
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal.isOpen} onClose={() => setModal({ ...modal, isOpen: false })} title={modal.title} message={modal.message} type={modal.type} />

      {reportModal.isOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto', padding: '2.5rem', borderTop: '10px solid #6366f1' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem' }}>
              <button onClick={handleDownloadPDF} className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', gap: '0.5rem', fontWeight: 800 }}>
                <Download size={18} /> DOWNLOAD PDF
              </button>
              <button onClick={() => setReportModal({ isOpen: false })} className="btn btn-ghost" style={{ padding: '0.5rem' }}>✕</button>
            </div>

            <div id="report-content" style={{ padding: '0.2rem', background: '#fff' }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.8rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <img src="/logo.png" alt="Logo" style={{ height: '40px' }} />
                  <div>
                    <h2 style={{ fontSize: '1.2rem', color: '#0f172a', margin: 0, fontWeight: 900 }}>{localStorage.getItem('name')}</h2>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, fontWeight: 700, letterSpacing: '0.5px' }}>OFFICIAL ATTENDANCE RECORD — {formatDate(date)}</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.8rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.55rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', margin: 0 }}>Grand Strength</p>
                    <h3 style={{ fontSize: '1.1rem', margin: '2px 0' }}>{calculateTotal('strength')}</h3>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.55rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', margin: 0 }}>Grand Present</p>
                    <h3 style={{ fontSize: '1.1rem', margin: '2px 0' }}>{calculateTotal('present')}</h3>
                  </div>
                  <div style={{ 
                    background: '#f8fafc', 
                    padding: '0.4rem 0.6rem', 
                    borderRadius: '6px', 
                    border: `1.5px solid ${getStatusColor(getPercentage(calculateTotal('present'), calculateTotal('strength')))}` 
                  }}>
                    <p style={{ fontSize: '0.55rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', margin: 0 }}>Total Percentage</p>
                    <h3 style={{ fontSize: '1.1rem', margin: '2px 0', color: getStatusColor(getPercentage(calculateTotal('present'), calculateTotal('strength'))) }}>
                      {getPercentage(calculateTotal('present'), calculateTotal('strength'))}%
                    </h3>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ textAlign: 'left', padding: '6px', fontSize: '0.65rem', borderBottom: '2px solid #e2e8f0' }}>Stream / Group</th>
                      <th style={{ textAlign: 'center', padding: '6px', fontSize: '0.65rem', borderBottom: '2px solid #e2e8f0' }}>Str</th>
                      <th style={{ textAlign: 'center', padding: '6px', fontSize: '0.65rem', borderBottom: '2px solid #e2e8f0' }}>Pre</th>
                      <th style={{ textAlign: 'center', padding: '6px', fontSize: '0.65rem', borderBottom: '2px solid #e2e8f0' }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(STREAMS).map(streamGroup => {
                      const groupSects = STREAMS[streamGroup].filter(sect => {
                        const id = `${streamGroup}|${sect}`;
                        return data[id]?.strength && data[id]?.present;
                      });
                      if (groupSects.length === 0) return null;
                      return (
                        <React.Fragment key={streamGroup}>
                          <tr>
                            <td colSpan="4" style={{ background: '#f8fafc', fontWeight: 900, color: '#4f46e5', fontSize: '0.85rem', padding: '6px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #e2e8f0' }}>
                              {streamGroup}
                            </td>
                          </tr>
                          {groupSects.map((sect, idx) => {
                            const id = `${streamGroup}|${sect}`;
                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ paddingLeft: '10px', fontWeight: 900, fontSize: '0.75rem', padding: '4px', color: '#0f172a' }}>{sect}</td>
                                <td style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 900, color: '#0f172a' }}>{data[id].strength}</td>
                                <td style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 900, color: '#0f172a' }}>{data[id].present}</td>
                                <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '0.75rem', color: getStatusColor(getPercentage(data[id].present, data[id].strength)) }}>
                                  {getPercentage(data[id].present, data[id].strength)}%
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 900, fontSize: '0.9rem' }}>GRAND TOTAL</td>
                      <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '0.9rem' }}>{calculateTotal('strength')}</td>
                      <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '0.9rem' }}>{calculateTotal('present')}</td>
                      <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '0.9rem', color: getStatusColor(getPercentage(calculateTotal('present'), calculateTotal('strength'))) }}>
                        {getPercentage(calculateTotal('present'), calculateTotal('strength'))}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
