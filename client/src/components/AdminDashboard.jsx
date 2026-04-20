import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Send, Users, LogOut, Check, ShieldAlert, Key, Globe, Clock, UserCheck, Trash2, Download } from 'lucide-react';
import axios from 'axios';
import Modal from './Modal';

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

// Master list of all possible campuses as requested to track "not sent"
const CAMPUSES = [
  "BANASWADI", "HORAMAVU", "KAGGADASPURA", "KR PURAM", "KUDLU", 
  "MARTHAHALLI", "MARTHAHALLI C-120", "BELLANDUR", "HEGDENAGAR", "RAJAJI NAGAR", 
  "SESHADRIPURAM", "VIDYARANYAPURA", "YESHWANTHPUR", "MAGADI ROAD", "PEENYA DASARAHALLI", 
  "ELECTRONIC CITY", "ELECTRONIC CITY DS", "ECITY NEET BOYS", "SARJAPURA", "NAGARBHAVI", 
  "UTTARAHALLI", "J P NAGAR", "BANNERGHATTA ROAD", "KORAMANGALA", "KANAKAPURA ROAD", 
  "MANGALORE", "TUMKUR", "MANDYA", "MYSORE", "DR BS RAO VIDYASOUDHA", 
  "HUBLI 2", "DAVANAGERE", "DAVANAGERE 2", "BALLARI GIRLS", "BALLARI BOYS", 
  "BELAGAVI", "KOLAR", "SHIVAMOGGA"
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalBranches: 0, submitted: 0, branches: [] });
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [view, setView] = useState('analytics'); // 'analytics' or 'approvals'
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'danger' });
  const [promptModal, setPromptModal] = useState({ isOpen: false, title: '', value: '', onConfirm: null });
  const [reportModal, setReportModal] = useState({ isOpen: false, data: null, branchName: '', date: '' });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const getPercentage = (p, s) => {
    const present = parseFloat(p) || 0;
    const strength = parseFloat(s) || 0;
    if (strength === 0) return 0;
    const pct = ((present / strength) * 100).toFixed(1);
    return isNaN(pct) ? 0 : pct;
  };

  const getStatusColor = (pct) => {
    if (pct < 75) return '#e11d48'; // Red
    if (pct < 85) return '#f59e0b'; // Orange
    if (pct < 95) return '#10b981'; // Light Green
    return '#065f46'; // Dark Green
  };

  const formatDate = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}-${m}-${y}`;
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [statsRes, pendingRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}/api/admin/stats?date=${selectedDate}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}/api/admin/pending`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setStats(statsRes.data);
      setPendingApprovals(pendingRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showModal = (title, message, type = 'info') => {
    setModal({ isOpen: true, title, message, type });
  };

  const handleApprove = async (userId, user) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}/api/admin/approve/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Construct WhatsApp Message
      const message = `Dear *Principal*,\n\nI hope this message finds you well.\n\nThis is to inform you that the account for the *College Attendance Portal* has been successfully *APPROVED* by the Administrator. The user may now *log in* using their credentials and access the portal.\n\nThank you.`;
      const whatsappUrl = `https://wa.me/${user.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      
      showModal('Success', `${user.principal_name} approved! Opening WhatsApp notification...`, 'success');
      
      // Small delay to let the modal show before redirecting
      setTimeout(() => {
        window.open(whatsappUrl, '_blank');
        fetchData();
      }, 1500);

    } catch (err) {
      showModal('Error', 'Approval failed', 'error');
    }
  };

  const resetPassword = (branch) => {
    setPromptModal({
      isOpen: true,
      title: `Reset Password for ${branch.principal_name}`,
      value: '',
      onConfirm: async (newPass) => {
        if (!newPass) return;
        try {
          await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}/api/admin/reset-password`, 
            { userId: branch.id, newPassword: newPass }, 
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          setModal({ isOpen: true, title: 'Success', message: 'Password has been updated.', type: 'success' });
        } catch (err) {
          setModal({ isOpen: true, title: 'Error', message: 'Failed to update password.', type: 'error' });
        }
      }
    });
  };

  const deleteUser = (branch) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Account?',
      message: `This will permanently delete ${branch.principal_name} and all their attendance records. This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await axios.delete(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}/api/admin/user/${branch.id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          setModal({ isOpen: true, title: 'Deleted', message: 'Account and data removed successfully.', type: 'success' });
          fetchData();
        } catch (err) {
          setModal({ isOpen: true, title: 'Error', message: 'Failed to delete user.', type: 'error' });
        }
      }
    });
  };

  const fetchBranchReport = async (branch) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}/api/admin/attendance/${branch.id}?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReportModal({ isOpen: true, data: res.data, branchName: branch.principal_name, date: selectedDate });
    } catch (err) {
      showModal('Error', 'Could not load report.', 'error');
    }
  };

  const handleDownloadPDF = () => {
    const element = document.getElementById('report-content');
    const opt = {
      margin: [3, 5, 3, 5],
      filename: `${formatDate(selectedDate)}_${reportModal.branchName}_COLLEGE ATTENDANCE.pdf`,
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

  return (
    <div className="dashboard-container">
      {loading && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="glass-card" style={{ padding: '2rem 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div className="loader-bar"><div className="loader-progress"></div></div>
            <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '1px' }}>SYNCING RECORDS...</p>
          </div>
        </div>
      )}
      <header className="glass-card header-card" style={{ display: 'flex', flexDirection: 'column', padding: '1.2rem 2rem', gap: '1rem', alignItems: 'flex-start' }}>
        <div className="brand-section" style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', borderBottom: '1px solid rgba(226, 232, 240, 0.4)', paddingBottom: '0.8rem' }}>
          <div className="logo-container" style={{ width: '50px', height: '50px', background: '#fff', borderRadius: '12px', padding: '5px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Admin Control Center: <span style={{ color: '#4f46e5' }}>College Records</span></h1>
            <p className="subtitle" style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>Real-time Campus Monitoring</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
          <div className="input-wrapper" style={{ marginRight: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0 12px', background: '#fff', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <Clock className="icon" size={16} />
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ padding: '0.5rem 0', border: 'none', background: 'transparent', fontSize: '0.85rem', fontWeight: 900, color: '#1e293b' }}
            />
          </div>
          <button onClick={() => setView('analytics')} className={`btn ${view === 'analytics' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', gap: '0.4rem' }}>
            <Globe size={16} /> Analytics
          </button>
          <button 
            onClick={async () => {
              try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}/api/admin/export-excel?date=${selectedDate}`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                if(!res.ok) throw new Error('Download failed');
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const parts = selectedDate.split('-');
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
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}/api/attendance/export-consolidated?date=${selectedDate}&admin=true`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                if(!res.ok) throw new Error('Download failed');
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const parts = selectedDate.split('-');
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
          <button onClick={() => setView('approvals')} className={`btn ${view === 'approvals' ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', gap: '0.4rem' }}>
            <CheckCircle size={16} /> Approvals {pendingApprovals.length > 0 && <span className="badge badge-pending" style={{ marginLeft: '5px' }}>{pendingApprovals.length}</span>}
          </button>
          <button onClick={Logout} className="btn btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', gap: '0.4rem', color: '#e11d48', background: '#ffe4e6' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {view === 'analytics' ? (
        <>
          <div className="form-grid" style={{ marginBottom: '1rem', gap: '1rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="glass-card" style={{ padding: '1rem 1.5rem', borderLeft: '6px solid #6366f1' }}>
              <p className="subtitle uppercase tracking-widest text-[9px] font-bold">Total Campuses</p>
              <h2 style={{ fontSize: '1.8rem', marginTop: '0.2rem' }}>{CAMPUSES.length}</h2>
            </div>
            <div 
              className="glass-card clickable-card" 
              onClick={() => setView('analytics')}
              style={{ padding: '1rem 1.5rem', borderLeft: '6px solid #10b981', cursor: 'pointer' }}
            >
              <p className="subtitle uppercase tracking-widest text-[9px] font-bold">Submitted Today</p>
              <h2 style={{ fontSize: '1.8rem', marginTop: '0.2rem', color: '#10b981' }}>{stats.submitted}</h2>
            </div>
            <div 
              className="glass-card" 
              onClick={() => {
                // Find registered and submitted properties from stats based on finalized status
                const submittedNames = stats.branches.filter(b => b.status === 'finalized').map(b => b.principal_name);
                
                // Diff the master CAMPUSES list against the ones that have submitted to find all pending 
                const pendingNames = CAMPUSES.filter(c => !submittedNames.includes(c));
                
                const listContent = pendingNames.length > 0 ? (
                  <div style={{ textAlign: 'left', maxHeight: '250px', overflowY: 'auto', padding: '0.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {pendingNames.map(name => {
                      // Attempt to lookup if they registered but are just missing today's submission
                      const registeredDetails = stats.branches.find(b => b.principal_name === name);
                      return (
                        <div key={name} style={{ padding: '0.5rem', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <ShieldAlert size={14} color="#e11d48" /> 
                          <span>{name} {registeredDetails ? <span style={{ color: '#64748b', fontSize: '0.75rem' }}>({registeredDetails.username})</span> : <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>(Not Registered Yet)</span>}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ fontWeight: 800, color: '#10b981' }}>All 38 campuses have submitted!</div>
                );
                showModal('Pending Campuses', listContent, 'info');
              }}
              style={{ padding: '1rem 1.5rem', borderLeft: '6px solid #f59e0b', cursor: 'pointer', transition: 'all 0.3s' }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <p className="subtitle uppercase tracking-widest text-[9px] font-bold">Pending Today</p>
              <h2 style={{ fontSize: '1.8rem', marginTop: '0.2rem' }}>{CAMPUSES.length - stats.submitted}</h2>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1rem 1.5rem' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Branch Status Directory</h2>
            <table>
              <thead>
                <tr>
                  <th>Branch / Principal</th>
                  <th>Contact Info</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.branches.map(branch => (
                  <tr key={branch.id}>
                    <td>
                      <div style={{ fontWeight: 800 }}>{branch.principal_name}</div>
                      <div className="subtitle" style={{ fontSize: '0.8rem' }}>ID: {branch.username}</div>
                    </td>
                    <td>
                      <div className="subtitle" style={{ fontSize: '0.8rem' }}>{branch.campus_email}</div>
                      <div style={{ fontWeight: 600, color: '#6366f1', fontSize: '0.85rem' }}>{branch.whatsapp_number}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {branch.status === 'finalized' ? (
                        <div 
                          onClick={() => fetchBranchReport(branch)}
                          style={{ cursor: 'pointer', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 900, fontSize: '1.1rem' }}>
                            <CheckCircle size={18} /> {getPercentage(branch.totalPresent, branch.totalStrength)}%
                          </div>
                          <div style={{ fontSize: '0.6rem', color: getStatusColor(getPercentage(branch.totalPresent, branch.totalStrength)), fontWeight: 800 }}>FINALIZED</div>
                        </div>
                      ) : branch.status === 'partial' ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontWeight: 900, fontSize: '1.1rem' }}>
                          <Clock size={18} /> {getPercentage(branch.totalPresent, branch.totalStrength)}%
                        </div>
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontWeight: 800, opacity: 0.5 }}>
                          <ShieldAlert size={16} /> 0%
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => resetPassword(branch)} className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem', gap: '0.3rem', height: '32px' }}>
                        <Key size={12} /> Reset
                      </button>
                      <button onClick={() => deleteUser(branch)} className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', fontSize: '0.7rem', gap: '0.3rem', color: '#e11d48', background: '#fff1f2', height: '32px' }}>
                        <Trash2 size={12} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="approvals-section">
          <h2 style={{ marginBottom: '1.5rem', paddingLeft: '1rem' }}>Pending Registrations</h2>
          {pendingApprovals.length === 0 ? (
            <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
              <CheckCircle size={48} style={{ color: '#10b981', marginBottom: '1rem' }} />
              <h2>No Pending Requests</h2>
              <p className="subtitle">All active campus accounts are approved.</p>
            </div>
          ) : (
            pendingApprovals.map(user => (
              <motion.div key={user.id} className="glass-card list-item" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <div>
                  <h3 style={{ fontWeight: 800 }}>{user.principal_name}</h3>
                  <div className="subtitle" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>{user.campus_email} | {user.whatsapp_number}</div>
                </div>
                <button onClick={() => handleApprove(user.id, user)} className="btn btn-primary">
                  <UserCheck size={18} /> Approve Account
                </button>
              </motion.div>
            ))
          )}
        </div>
      )}

      <Modal isOpen={modal.isOpen} onClose={() => setModal({ ...modal, isOpen: false })} title={modal.title} message={modal.message} type={modal.type} />

      {confirmModal.isOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card" style={{ padding: '2rem', maxWidth: '400px', textAlign: 'center' }}>
            <ShieldAlert size={48} style={{ color: '#e11d48', marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>{confirmModal.title}</h2>
            <p className="subtitle" style={{ marginBottom: '2rem' }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })} className="btn btn-ghost">Cancel</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, isOpen: false }); }} className="btn btn-primary" style={{ background: '#e11d48' }}>Delete Permanently</button>
            </div>
          </motion.div>
        </div>
      )}

      {promptModal.isOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card" style={{ padding: '2rem', maxWidth: '400px', width: '90%' }}>
            <Key size={32} style={{ color: '#6366f1', marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>{promptModal.title}</h2>
            <div className="input-wrapper" style={{ marginBottom: '2rem' }}>
              <input 
                type="text" 
                placeholder="Enter new password..." 
                autoFocus
                value={promptModal.value}
                onChange={(e) => setPromptModal({ ...promptModal, value: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && promptModal.onConfirm(promptModal.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setPromptModal({ ...promptModal, isOpen: false })} className="btn btn-ghost">Cancel</button>
              <button onClick={() => { promptModal.onConfirm(promptModal.value); setPromptModal({ ...promptModal, isOpen: false }); }} className="btn btn-primary">Update Password</button>
            </div>
          </motion.div>
        </div>
      )}

      {reportModal.isOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflow: 'auto', padding: '2.5rem', borderTop: '10px solid #6366f1' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem' }}>
              <button onClick={handleDownloadPDF} className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', gap: '0.5rem', fontWeight: 800 }}>
                <Download size={18} /> DOWNLOAD PDF
              </button>
              <button onClick={() => setReportModal({ ...reportModal, isOpen: false })} className="btn btn-ghost" style={{ padding: '0.5rem' }}>✕</button>
            </div>

            <div id="report-content" style={{ padding: '8mm', background: '#fff' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '1.2rem', borderBottom: '3px solid #f1f5f9', paddingBottom: '0.8rem' }}>
                  <img src="/logo.png" alt="Logo" style={{ height: '50px' }} />
                  <div>
                    <h2 style={{ fontSize: '1.6rem', color: '#0f172a', margin: 0, fontWeight: 900, textTransform: 'uppercase' }}>{reportModal.branchName}</h2>
                    <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0, fontWeight: 700, letterSpacing: '0.8px' }}>OFFICIAL ATTENDANCE REPORT — {formatDate(reportModal.date)}</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem', marginBottom: '1.2rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', margin: 0 }}>Grand Strength</p>
                    <h3 style={{ fontSize: '1.6rem', margin: '4px 0', fontWeight: 900 }}>{reportModal.data.reduce((s, a) => s + a.strength, 0)}</h3>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', margin: 0 }}>Grand Present</p>
                    <h3 style={{ fontSize: '1.6rem', margin: '4px 0', fontWeight: 900 }}>{reportModal.data.reduce((s, a) => s + a.present, 0)}</h3>
                  </div>
                  <div style={{ 
                    background: '#f8fafc', 
                    padding: '0.8rem', 
                    borderRadius: '8px', 
                    border: `2px solid ${getStatusColor(getPercentage(reportModal.data.reduce((s, a) => s + a.present, 0), reportModal.data.reduce((s, a) => s + a.strength, 0)))}` 
                  }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', margin: 0 }}>Total Percentage</p>
                    <h3 style={{ fontSize: '1.6rem', margin: '4px 0', fontWeight: 900, color: getStatusColor(getPercentage(reportModal.data.reduce((s, a) => s + a.present, 0), reportModal.data.reduce((s, a) => s + a.strength, 0))) }}>
                      {getPercentage(reportModal.data.reduce((s, a) => s + a.present, 0), reportModal.data.reduce((s, a) => s + a.strength, 0))}%
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
                        const found = reportModal.data.find(d => d.stream === sect && d.branch === streamGroup);
                        return found && (found.strength || found.present);
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
                            const found = reportModal.data.find(d => d.stream === sect && d.branch === streamGroup);
                            const isSenior = streamGroup === 'INCOMING SENIORS' || streamGroup === 'OUTGOING SENIORS';
                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ paddingLeft: '10px', fontWeight: 700, fontSize: '0.75rem', padding: '4px', color: '#0f172a' }}>{sect}</td>
                                {isSenior ? (
                                  <>
                                    <td style={{ textAlign: 'center', fontSize: '0.75rem', color: '#6366f1' }}>{found.cbse_strength || 0}</td>
                                    <td style={{ textAlign: 'center', fontSize: '0.75rem', color: '#6366f1' }}>{found.cbse_present || 0}</td>
                                    <td style={{ textAlign: 'center', fontSize: '0.75rem', color: '#ec4899' }}>{found.pu_strength || 0}</td>
                                    <td style={{ textAlign: 'center', fontSize: '0.75rem', color: '#ec4899' }}>{found.pu_present || 0}</td>
                                  </>
                                ) : (
                                  <>
                                    <td colSpan="2" style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>{found.strength || 0} (TOT)</td>
                                    <td colSpan="2" style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>{found.present || 0} (PRE)</td>
                                  </>
                                )}
                                <td style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 800, color: '#0f172a' }}>{found.present || 0}</td>
                                <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '0.75rem', color: getStatusColor(getPercentage(found.present, found.strength)) }}>
                                  {getPercentage(found.present, found.strength)}%
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
                      <td style={{ padding: '12px 15px', fontWeight: 900, fontSize: '1.1rem' }}>GRAND TOTAL</td>
                      <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '1.1rem' }}>{reportModal.data.reduce((s, a) => s + a.strength, 0)}</td>
                      <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '1.1rem' }}>{reportModal.data.reduce((s, a) => s + a.present, 0)}</td>
                      <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '1.1rem', color: getStatusColor(getPercentage(reportModal.data.reduce((s, a) => s + a.present, 0), reportModal.data.reduce((s, a) => s + a.strength, 0))) }}>
                        {getPercentage(reportModal.data.reduce((s, a) => s + a.present, 0), reportModal.data.reduce((s, a) => s + a.strength, 0))}%
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
