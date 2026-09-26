import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { FAQ_ITEMS } from '../utils/mockData';

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="section-spacing" style={{ backgroundColor: 'var(--bg-canvas)', borderBottom: '1px solid var(--border-color)' }}>
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px auto' }}>
          <div className="badge badge-blue" style={{ marginBottom: '16px' }}>
            <HelpCircle size={14} />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="heading-lg" style={{ marginBottom: '16px' }}>
            Technical & Architecture Details
          </h2>
          <p className="body-lead">
            Everything you need to know about how SPECIFY processes data and evaluates liquidity.
          </p>
        </div>

        {/* Accordion Container */}
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div
                key={idx}
                className="card"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => toggle(idx)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                  <h3 className="heading-sm" style={{ fontSize: '16px', margin: 0 }}>
                    {item.q}
                  </h3>
                  <div style={{
                    color: isOpen ? 'var(--brand-blue)' : 'var(--text-muted)',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }}>
                    <ChevronDown size={20} />
                  </div>
                </div>

                {isOpen && (
                  <p className="body-text" style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
