import React, { useState, useRef, useEffect } from 'react';
import Info from '../pages/Info'; // The existing Info page component

export default function ProjectInfoWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Handle Window Resize to keep widget in bounds
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 60),
        y: Math.min(prev.y, window.innerHeight - 60)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    // Calculate new position, keeping it within window bounds
    const newX = Math.max(0, Math.min(e.clientX - dragStart.current.x, window.innerWidth - 40));
    const newY = Math.max(0, Math.min(e.clientY - dragStart.current.y, window.innerHeight - 40));
    
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
  };

  // Register document listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <>
      {/* Draggable FAB */}
      <div
        className="project-info-fab"
        title="Info"
        onMouseDown={handleMouseDown}
        onClick={() => {
          // Only toggle if we didn't just drag
          if (!isDragging) setIsOpen(!isOpen);
        }}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'var(--accent-primary)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: 9999,
          userSelect: 'none',
          transition: isDragging ? 'none' : 'transform 0.2s',
          transform: isOpen ? 'scale(0.9)' : 'scale(1)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      </div>

      {/* Info Modal */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }} onClick={() => setIsOpen(false)}>
          <div 
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              borderRadius: '12px', 
              width: '100%', 
              maxWidth: '800px', 
              maxHeight: '90vh', 
              overflowY: 'auto',
              border: '1px solid var(--border-medium)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
          >
            <button 
              onClick={() => setIsOpen(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '24px',
                zIndex: 10
              }}
            >
              ✕
            </button>
            <div style={{ padding: '24px' }}>
              <Info />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
