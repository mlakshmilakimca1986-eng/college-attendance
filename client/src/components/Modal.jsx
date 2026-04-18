import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, message, type = 'info' }) {
  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle2 className="text-emerald-500" size={48} />,
    error: <AlertCircle className="text-rose-500" size={48} />,
    info: <Info className="text-indigo-500" size={48} />
  };

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="modal-content"
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            {icons[type] || icons.info}
          </div>
          <h2 style={{ marginBottom: '1rem', color: '#1e1b4b' }}>{title}</h2>
          <p className="subtitle" style={{ marginBottom: '2rem', lineHeight: '1.6' }}>{message}</p>
          <button onClick={onClose} className="btn btn-primary" style={{ width: '100%' }}>
            OK
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
