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
  const [isFinalizing, setIsFinalizing] = useState(false);
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
          const existing = res.data.find(r => 
            r.stream?.trim().toLowerCase() === sect.trim().toLowerCase() && 
            r.branch?.trim().toLowerCase() === stream.trim().toLowerCase()
          );
          
          // Treat 1, "1", or true as finalized
          const isLocked = existing && (
            existing.finalized === 1 || 
            existing.finalized === true || 
            existing.finalized === "1" ||
            existing.finalized > 0
          );

          initialData[key] = { 
            cbse_strength: existing ? (existing.cbse_strength ?? '') : '',
            cbse_present: existing ? (existing.cbse_present ?? '') : '',
            pu_strength: existing ? (existing.pu_strength ?? '') : '',
            pu_present: existing ? (existing.pu_present ?? '') : '',
            // Ensure juniors use their direct columns if CBSE/PU are missing
            strength: existing ? (existing.strength ?? '') : '', 
            present: existing ? (existing.present ?? '') : '',
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
          const row = currentData[key];
          return { 
            branch, 
            stream, 
            strength: row.strength, 
            present: row.present,
            cbse_strength: row.cbse_strength,
            cbse_present: row.cbse_present,
            pu_strength: row.pu_strength,
            pu_present: row.pu_present
          };
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
    // Strictly prevent negative numbers
    if (value !== "" && parseInt(value) < 0) return;
    
    const oldRow = data[id] || {};
    const newRow = { ...oldRow, [field]: value };
    
    // Only calculate overall totals for Senior branches (CBSE + PU)
    const [stream] = id.split('|');
    if (stream === 'INCOMING SENIORS' || stream === 'OUTGOING SENIORS') {
      const cs = parseInt(field === 'cbse_strength' ? value : (newRow.cbse_strength || 0)) || 0;
      const cp = parseInt(field === 'cbse_present' ? value : (newRow.cbse_present || 0)) || 0;
      const ps = parseInt(field === 'pu_strength' ? value : (newRow.pu_strength || 0)) || 0;
      const pp = parseInt(field === 'pu_present' ? value : (newRow.pu_present || 0)) || 0;
      
      newRow.strength = cs + ps;
      newRow.present = cp + pp;
    }

    const newData = { ...data, [id]: newRow };
    setData(newData);
    autoSave(newData, date);
  };

  const showModal = (title, message, type = 'info') => {
    setModal({ isOpen: true, title, message, type });
  };

   const finalizeReport = async () => {
    setIsFinalizing(true);
    try {
      const token = localStorage.getItem('token');
        const formattedData = Object.keys(data).map(key => {
          const [branch, stream] = key.split('|');
          const row = data[key];
          return { 
            branch, 
            stream, 
            strength: row.strength,
            present: row.present,
            cbse_strength: row.cbse_strength, 
            cbse_present: row.cbse_present, 
            pu_strength: row.pu_strength, 
            pu_present: row.pu_present 
          };
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
    } finally {
      setIsFinalizing(false);
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
    const present = parseFloat(p) || 0;
    const strength = parseFloat(s) || 0;
    if (strength === 0) return 0;
    const pct = ((present / strength) * 100).toFixed(1);
    return isNaN(pct) ? 0 : pct;
  };

  const formatDate = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}-${m}-${y}`;
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('report-content');
    const opt = {
      margin: 10,
      filename: `${formatDate(date)}_${localStorage.getItem('name') || 'CAMPUS'}_REPORT.pdf`,
      image: { type: 'png', quality: 1.0 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true,
        scrollY: 0,
        scrollX: 0,
        windowHeight: element.scrollHeight
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
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
      <header className="glass-card header-card" style={{ display: 'flex', flexDirection: 'column', padding: '1.2rem 2rem', gap: '1rem', alignItems: 'flex-start' }}>
        <div className="brand-section" style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', borderBottom: '1px solid rgba(226, 232, 240, 0.4)', paddingBottom: '0.8rem' }}>
          <div className="logo-container" style={{ width: '50px', height: '50px', background: '#fff', borderRadius: '12px', padding: '5px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Daily Attendance College: <span style={{ color: '#4f46e5' }}>{localStorage.getItem('name')}</span></h1>
            <p className="subtitle" style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>Official Attendance Reporting Portal</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
          <div className="input-wrapper" style={{ marginRight: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0 12px', background: '#fff', display: 'flex', alignItems: 'center', gap: '0.8rem', position: 'relative' }}>
            <Calendar className="icon" size={16} style={{ color: '#4f46e5', position: 'absolute', left: '12px' }} />
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              style={{ padding: '0.5rem 0', paddingLeft: '2rem', border: 'none', background: 'transparent', fontSize: '0.85rem', fontWeight: 900, color: '#1e293b' }}
            />
          </div>
          <button onClick={() => setReportModal({ isOpen: true })} className="btn btn-ghost" style={{ gap: '0.4rem', background: '#f5f3ff', color: '#6d28d9', fontSize: '0.75rem', padding: '0.5rem 1rem' }}>
            <Eye size={16} /> Preview
          </button>
          <button 
            onClick={async () => {
              try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}/api/attendance/export-excel?date=${date}`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                if(!res.ok) throw new Error('Download failed');
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const parts = date.split('-');
                a.download = `${parts[2]}-${parts[1]}-${parts[0]}_COLLEGE ATTENDANCE.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
              } catch (e) {
                showModal('Error', 'Failed to export excel file.', 'error');
              }
            }} 
            className="btn btn-primary" 
            style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', gap: '0.4rem', background: '#3b82f6', borderColor: '#3b82f6' }}
          >
            <Download size={16} /> COLLEGE ATTENDANCE
          </button>
          <button 
            onClick={async () => {
              try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}/api/attendance/export-consolidated?date=${date}`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                if(!res.ok) throw new Error('Download failed');
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const parts = date.split('-');
                a.download = `${parts[2]}-${parts[1]}-${parts[0]}_STREAM-WISE_DAILY_ATTENDANCE.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
              } catch (e) {
                showModal('Error', 'Failed to export consolidated excel file.', 'error');
              }
            }} 
            className="btn btn-primary" 
            style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', gap: '0.4rem', background: '#10b981', borderColor: '#10b981' }}
          >
            <Download size={16} /> STREAM-WISE DAILY ATTENDANCE
          </button>
          <button 
            onClick={finalizeReport} 
            className="btn btn-primary" 
            style={{ gap: '0.4rem', fontSize: '0.75rem', padding: '0.5rem 1rem' }}
            disabled={isFinalizing}
          >
            {isFinalizing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {isFinalizing ? 'Finalizing...' : 'Finalize'}
          </button>
          <button onClick={Logout} className="btn btn-ghost" style={{ gap: '0.4rem', border: 'none', color: '#be123c', background: '#fff1f2', fontSize: '0.75rem', padding: '0.5rem 1rem' }}>
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
          {/* Table header removed as per sketch request */}
          <tbody>
            {Object.keys(STREAMS).map(stream => (
              <React.Fragment key={stream}>
                  {(stream === 'INCOMING SENIORS' || stream === 'OUTGOING SENIORS') ? (
                    <>
                      <tr key={stream + '_heading'} style={{ background: '#f8fafc' }}>
                        <th rowSpan="2" style={{ width: '18%', padding: '1rem', textAlign: 'left', borderLeft: '4px solid #4f46e5', color: '#1e293b', fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase' }}>{stream}</th>
                        <th colSpan="2" style={{ textAlign: 'center', color: '#6366f1', fontSize: '0.75rem', fontWeight: 900, background: '#f5f3ff', borderBottom: '1px solid #e0e7ff' }}>CBSE</th>
                        <th colSpan="2" style={{ textAlign: 'center', color: '#ec4899', fontSize: '0.75rem', fontWeight: 900, background: '#fdf2f8', borderBottom: '1px solid #fce7f3' }}>PU</th>
                        <th rowSpan="2" style={{ width: '12%', textAlign: 'center', fontSize: '0.65rem', color: '#64748b', fontWeight: 900, background: '#f8fafc' }}>TOTAL</th>
                        <th rowSpan="2" style={{ width: '10%', textAlign: 'center', fontSize: '0.65rem', color: '#64748b', fontWeight: 900, background: '#f8fafc' }}>%</th>
                        <th rowSpan="2" style={{ width: '8%', textAlign: 'center', fontSize: '0.65rem', color: '#64748b', fontWeight: 900, background: '#f8fafc' }}>ST</th>
                      </tr>
                      <tr key={stream + '_subheading'} style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ textAlign: 'center', fontSize: '0.6rem', color: '#6366f1', padding: '0.3rem', background: '#f5f3ff' }}>STR</th>
                        <th style={{ textAlign: 'center', fontSize: '0.6rem', color: '#6366f1', padding: '0.3rem', background: '#f5f3ff' }}>PRE</th>
                        <th style={{ textAlign: 'center', fontSize: '0.6rem', color: '#ec4899', padding: '0.3rem', background: '#fdf2f8' }}>STR</th>
                        <th style={{ textAlign: 'center', fontSize: '0.6rem', color: '#ec4899', padding: '0.3rem', background: '#fdf2f8' }}>PRE</th>
                      </tr>
                    </>
                  ) : (
                    <tr key={stream + '_junior_heading'} style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ width: '18%', padding: '1rem', textAlign: 'left', borderLeft: '4px solid #4f46e5', color: '#1e293b', fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase' }}>{stream}</th>
                      <th colSpan="2" style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', fontWeight: 900 }}>STR</th>
                      <th colSpan="2" style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', fontWeight: 900 }}>PRE</th>
                      <th style={{ width: '12%', textAlign: 'center', fontSize: '0.65rem', color: '#64748b', fontWeight: 900 }}>TOTAL</th>
                      <th style={{ width: '10%', textAlign: 'center', fontSize: '0.65rem', color: '#64748b', fontWeight: 900 }}>%</th>
                      <th style={{ width: '8%', textAlign: 'center', fontSize: '0.65rem', color: '#64748b', fontWeight: 900 }}>ST</th>
                    </tr>
                  )}
                {STREAMS[stream].map(section => {
                  const id = `${stream}|${section}`;
                  return (
                    <tr key={id} style={{ opacity: data[id]?.finalized ? 0.7 : 1 }}>
                      <td style={{ paddingLeft: '3rem', fontWeight: 700 }}>{section}</td>
                      {(stream === 'INCOMING SENIORS' || stream === 'OUTGOING SENIORS') ? (
                        <>
                          <td style={{ textAlign: 'center', background: '#f5f3ff' }}>
                            <input 
                              type="number" className="btn btn-ghost" style={{ width: '75px', padding: '0.3rem', textAlign: 'center', fontWeight: 900, fontSize: '0.8rem', color: '#6366f1' }} 
                              value={data[id]?.cbse_strength || ''} 
                              onChange={(e) => handleInputChange(id, 'cbse_strength', e.target.value)}
                              disabled={data[id]?.finalized}
                              placeholder="STR"
                              min="0"
                            />
                          </td>
                          <td style={{ textAlign: 'center', background: '#f5f3ff' }}>
                            <input 
                              type="number" className="btn btn-ghost" style={{ width: '75px', padding: '0.3rem', textAlign: 'center', fontWeight: 900, fontSize: '0.8rem', color: '#6366f1' }} 
                              value={data[id]?.cbse_present || ''} 
                              onChange={(e) => handleInputChange(id, 'cbse_present', e.target.value)}
                              disabled={data[id]?.finalized}
                              placeholder="PRE"
                              min="0"
                            />
                          </td>
                          <td style={{ textAlign: 'center', background: '#fdf2f8' }}>
                            <input 
                              type="number" className="btn btn-ghost" style={{ width: '75px', padding: '0.3rem', textAlign: 'center', fontWeight: 900, fontSize: '0.8rem', color: '#ec4899' }} 
                              value={data[id]?.pu_strength || ''} 
                              onChange={(e) => handleInputChange(id, 'pu_strength', e.target.value)}
                              disabled={data[id]?.finalized}
                              placeholder="STR"
                              min="0"
                            />
                          </td>
                          <td style={{ textAlign: 'center', background: '#fdf2f8' }}>
                            <input 
                              type="number" className="btn btn-ghost" style={{ width: '75px', padding: '0.3rem', textAlign: 'center', fontWeight: 900, fontSize: '0.8rem', color: '#ec4899' }} 
                              value={data[id]?.pu_present || ''} 
                              onChange={(e) => handleInputChange(id, 'pu_present', e.target.value)}
                              disabled={data[id]?.finalized}
                              placeholder="PRE"
                              min="0"
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td colSpan="2" style={{ textAlign: 'center' }}>
                            <input 
                              type="number" className="btn btn-ghost" style={{ width: '130px', padding: '0.3rem', textAlign: 'center', fontWeight: 900, fontSize: '0.9rem', color: '#64748b' }} 
                              value={data[id]?.strength || ''} 
                              onChange={(e) => handleInputChange(id, 'strength', e.target.value)}
                              disabled={data[id]?.finalized}
                              placeholder="TOTAL STR"
                              min="0"
                            />
                          </td>
                          <td colSpan="2" style={{ textAlign: 'center' }}>
                            <input 
                              type="number" className="btn btn-ghost" style={{ width: '130px', padding: '0.3rem', textAlign: 'center', fontWeight: 900, fontSize: '0.9rem', color: '#64748b' }} 
                              value={data[id]?.present || ''} 
                              onChange={(e) => handleInputChange(id, 'present', e.target.value)}
                              disabled={data[id]?.finalized}
                              placeholder="TOTAL PRE"
                              min="0"
                            />
                          </td>
                        </>
                      )}
                      <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '0.9rem', color: '#0f172a', background: '#f8fafc', borderLeft: '1px solid #e2e8f0' }}>
                        {data[id]?.present || 0} / {data[id]?.strength || 0}
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

            <div id="report-content" style={{ padding: '8mm', background: '#fff' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '1.2rem', borderBottom: '3px solid #f1f5f9', paddingBottom: '0.8rem' }}>
                  <img src="/logo.png" alt="Logo" style={{ height: '50px' }} />
                  <div>
                    <h2 style={{ fontSize: '1.6rem', color: '#0f172a', margin: 0, fontWeight: 900, textTransform: 'uppercase' }}>{localStorage.getItem('name')}</h2>
                    <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, fontWeight: 700, letterSpacing: '0.8px' }}>OFFICIAL ATTENDANCE RECORD — {formatDate(date)}</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem', marginBottom: '1.2rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', margin: 0 }}>Grand Strength</p>
                    <h3 style={{ fontSize: '1.6rem', margin: '4px 0', fontWeight: 900 }}>{calculateTotal('strength')}</h3>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', margin: 0 }}>Grand Present</p>
                    <h3 style={{ fontSize: '1.6rem', margin: '4px 0', fontWeight: 900 }}>{calculateTotal('present')}</h3>
                  </div>
                  <div style={{ 
                    background: '#f8fafc', 
                    padding: '0.8rem', 
                    borderRadius: '8px', 
                    border: `2px solid ${getStatusColor(getPercentage(calculateTotal('present'), calculateTotal('strength')))}` 
                  }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', margin: 0 }}>Total Percentage</p>
                    <h3 style={{ fontSize: '1.6rem', margin: '4px 0', fontWeight: 900, color: getStatusColor(getPercentage(calculateTotal('present'), calculateTotal('strength'))) }}>
                      {getPercentage(calculateTotal('present'), calculateTotal('strength'))}%
                    </h3>
                  </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th rowSpan="2" style={{ textAlign: 'left', padding: '5px', fontSize: '0.7rem', borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>STREAM / GROUP</th>
                      <th colSpan="2" style={{ textAlign: 'center', padding: '5px', fontSize: '0.7rem', borderBottom: '1px solid #e2e8f0', color: '#6366f1' }}>CBSE</th>
                      <th colSpan="2" style={{ textAlign: 'center', padding: '5px', fontSize: '0.7rem', borderBottom: '1px solid #e2e8f0', color: '#ec4899' }}>PU</th>
                      <th rowSpan="2" style={{ textAlign: 'center', padding: '5px', fontSize: '0.7rem', borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>TOT</th>
                      <th rowSpan="2" style={{ textAlign: 'center', padding: '5px', fontSize: '0.7rem', borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>%</th>
                    </tr>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ textAlign: 'center', padding: '3px', fontSize: '0.6rem', color: '#6366f1' }}>S</th>
                      <th style={{ textAlign: 'center', padding: '3px', fontSize: '0.6rem', color: '#6366f1' }}>P</th>
                      <th style={{ textAlign: 'center', padding: '3px', fontSize: '0.6rem', color: '#ec4899' }}>S</th>
                      <th style={{ textAlign: 'center', padding: '3px', fontSize: '0.6rem', color: '#ec4899' }}>P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(STREAMS).map(streamGroup => {
                      const groupSects = STREAMS[streamGroup].filter(sect => {
                        const id = `${streamGroup}|${sect}`;
                        return data[id]?.strength || data[id]?.present;
                      });
                      if (groupSects.length === 0) return null;
                      return (
                        <React.Fragment key={streamGroup}>
                          <tr>
                            <td colSpan="7" style={{ background: '#f1f5f9', fontWeight: 900, color: '#4f46e5', fontSize: '0.8rem', padding: '6px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #e2e8f0' }}>
                              {streamGroup}
                            </td>
                          </tr>
                          {groupSects.map((sect, idx) => {
                            const id = `${streamGroup}|${sect}`;
                            const isSenior = streamGroup === 'INCOMING SENIORS' || streamGroup === 'OUTGOING SENIORS';
                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ paddingLeft: '10px', fontWeight: 700, fontSize: '0.75rem', padding: '4px', color: '#0f172a' }}>{sect}</td>
                                {isSenior ? (
                                  <>
                                    <td style={{ textAlign: 'center', fontSize: '0.75rem', color: '#6366f1' }}>{data[id].cbse_strength || 0}</td>
                                    <td style={{ textAlign: 'center', fontSize: '0.75rem', color: '#6366f1' }}>{data[id].cbse_present || 0}</td>
                                    <td style={{ textAlign: 'center', fontSize: '0.75rem', color: '#ec4899' }}>{data[id].pu_strength || 0}</td>
                                    <td style={{ textAlign: 'center', fontSize: '0.75rem', color: '#ec4899' }}>{data[id].pu_present || 0}</td>
                                  </>
                                ) : (
                                  <>
                                    <td colSpan="2" style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>{data[id].strength || 0} (TOT)</td>
                                    <td colSpan="2" style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>{data[id].present || 0} (PRE)</td>
                                  </>
                                )}
                                <td style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>{data[id].present || 0}</td>
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
                      <td style={{ padding: '8px 10px', fontWeight: 900, fontSize: '0.85rem' }}>GRAND TOTAL</td>
                      <td colSpan="4" style={{ textAlign: 'right', paddingRight: '15px', fontSize: '0.7rem', color: '#cbd5e1' }}>Overall Summary:</td>
                      <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '0.85rem' }}>{calculateTotal('present')} / {calculateTotal('strength')}</td>
                      <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '0.85rem', color: getStatusColor(getPercentage(calculateTotal('present'), calculateTotal('strength'))) }}>
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
