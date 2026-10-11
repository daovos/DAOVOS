import React from 'react';

/**
 * DAOVOS Hero Bottom-Left Specification Block
 * Editorial heading with a quiet section marker and readable narrative.
 */
export const HeroBottomLeft = ({
  title = 'ARCHITECTURAL DIGITAL SYSTEMS',
  description = 'DAOVOS engineers modular visual operating systems — architectural precision, structural reliability, monumental scale.'
}) => {
  return (
    <div
      className="hero-bottom-left flex-col"
      style={{
        maxWidth: '340px',
        textAlign: 'left',
        zIndex: 25
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '12px'
        }}
      >
        <div
          style={{
            width: '32px',
            height: '1px',
            background: 'rgba(237, 230, 223, 0.4)'
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-family-mono)',
            fontSize: '10px',
            letterSpacing: '0.16em',
            color: 'rgba(244, 238, 232, 0.62)'
          }}
        >
          01 // INTRO
        </span>
      </div>
      <h3
        style={{
          fontFamily: '"Satoshi", var(--font-family-body)',
          fontSize: 'clamp(23px, 2.2vw, 30px)',
          fontWeight: 400,
          letterSpacing: '-0.025em',
          lineHeight: 1.15,
          color: 'var(--daovos-color-bone-white)',
          margin: '0 0 16px',
          maxWidth: '16ch'
        }}
      >
        {title.toLowerCase().replace(/^./, ch => ch.toUpperCase())}
      </h3>
      <p
        style={{
          fontFamily: 'var(--font-family-body)',
          fontSize: '14px',
          lineHeight: 1.65,
          color: 'rgba(244, 238, 232, 0.78)',
          margin: 0,
          maxWidth: '320px'
        }}
      >
        {description}
      </p>
    </div>
  );
};

export default HeroBottomLeft;
