import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Mail, Phone, UserCheck, ArrowRight, ShieldCheck, ChevronDown } from 'lucide-react';
import axios from 'axios';
import Modal from './Modal';
import { Building2 } from 'lucide-react';

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

export default function AuthPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    principal_name: '',
    campus_email: '',
    whatsapp_number: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const showModal = (title, message, type = 'info') => {
    setModal({ isOpen: true, title, message, type });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'}${endpoint}`, formData);
      
      if (isLogin) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('role', res.data.role);
        localStorage.setItem('name', res.data.name);
        onLoginSuccess(res.data);
      } else {
        showModal('Registration Successful', 'Your request has been submitted for approval.', 'success');
        setIsLogin(true);
      }
    } catch (err) {
      const msg = err.response?.data || 'Connection failed.';
      setError(msg);
      showModal('Oops!', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="auth-container">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card auth-card"
        >
          <div className="auth-logo" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <img src="/logo.png" alt="Logo" style={{ maxHeight: '100px' }} />
          </div>

          <div className="auth-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1>{isLogin ? 'Login' : 'Register'}</h1>
            <p className="subtitle">{isLogin ? 'Enter credentials to access portal' : 'Register campus for reporting'}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={!isLogin ? 'form-grid' : ''}>
              {!isLogin && (
                <>
                  <div className="form-group">
                    <label>Principal Campus Name</label>
                    <div className="input-wrapper" style={{ position: 'relative' }}>
                      <Building2 size={18} className="icon" />
                      <select 
                        name="principal_name" 
                        onChange={handleChange} 
                        className="custom-select" 
                        required
                        value={formData.principal_name}
                        style={{ 
                          width: '100%', 
                          background: 'transparent', 
                          border: 'none', 
                          padding: '0.8rem 3rem', 
                          color: '#1e293b', 
                          appearance: 'none', 
                          fontWeight: 600,
                          cursor: 'pointer',
                          zIndex: 2
                        }}
                      >
                        <option value="" disabled>Select Campus</option>
                        {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown size={18} style={{ position: 'absolute', right: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Campus Mail ID</label>
                    <div className="input-wrapper">
                      <Mail size={18} className="icon" />
                      <input name="campus_email" type="email" onChange={handleChange} placeholder="campus@college.edu" required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>WhatsApp Number</label>
                    <div className="input-wrapper">
                      <Phone size={18} className="icon" />
                      <input name="whatsapp_number" onChange={handleChange} placeholder="+91 XXXXXXXXXX" required />
                    </div>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Username / Email</label>
                <div className="input-wrapper">
                  <User size={18} className="icon" />
                  <input name="username" onChange={handleChange} placeholder="admin or email" required />
                </div>
              </div>

              <div className={`form-group ${!isLogin ? 'col-span-2' : ''}`} style={!isLogin ? { gridColumn: 'span 2' } : {}}>
                <label>Password</label>
                <div className="input-wrapper">
                  <Lock size={18} className="icon" />
                  <input name="password" type="password" onChange={handleChange} placeholder="••••••••" required />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} disabled={loading}>
              {loading ? 'Processing...' : (isLogin ? 'Login Now' : 'Create Account')}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="auth-footer" style={{ marginTop: '2rem', textAlign: 'center', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
            <p className="subtitle" style={{ marginBottom: '1rem' }}>{isLogin ? 'New Campus?' : 'Already registered?'}</p>
            <button onClick={() => setIsLogin(!isLogin)} className="btn btn-ghost" style={{ width: '100%' }}>
              {isLogin ? 'Register Principal' : 'Back to Login'}
            </button>
          </div>
        </motion.div>
      </div>

      <Modal 
        isOpen={modal.isOpen} 
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </>
  );
}
