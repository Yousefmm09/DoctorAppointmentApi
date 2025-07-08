import React, { useEffect, useRef, useState } from 'react';

/**
 * Component that converts an SVG to a PNG image
 * @param {Object} props - Component props
 * @param {string} props.svgSrc - Path to the SVG file
 * @param {number} props.width - Width of the output PNG
 * @param {number} props.height - Height of the output PNG
 * @param {string} props.alt - Alt text for the image
 * @param {string} props.className - CSS class for the image
 * @returns {JSX.Element} React component
 */
const SvgToPng = ({ svgSrc, width, height, alt, className }) => {
  const [pngSrc, setPngSrc] = useState('');
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const convertSvgToPng = async () => {
      try {
        // Create an image element to load the SVG
        const img = new Image();
        img.src = svgSrc;
        
        // When the image loads, draw it to the canvas
        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          
          canvas.width = width || img.width;
          canvas.height = height || img.height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Convert the canvas content to a PNG data URL
          try {
            const pngDataUrl = canvas.toDataURL('image/png');
            setPngSrc(pngDataUrl);
          } catch (err) {
            console.error('Error converting to PNG:', err);
            // Fallback to original SVG
            setPngSrc(svgSrc);
          }
        };
        
        img.onerror = (err) => {
          console.error('Error loading SVG:', err);
          setPngSrc(svgSrc); // Fallback to original SVG
        };
      } catch (err) {
        console.error('Error in SVG to PNG conversion:', err);
        setPngSrc(svgSrc); // Fallback to original SVG
      }
    };
    
    convertSvgToPng();
  }, [svgSrc, width, height]);
  
  return (
    <>
      <canvas 
        ref={canvasRef} 
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      {pngSrc ? (
        <img 
          src={pngSrc} 
          alt={alt || 'Converted PNG image'} 
          className={className || ''}
          width={width}
          height={height}
        />
      ) : (
        <div className={`flex items-center justify-center ${className || ''}`} style={{ width, height }}>
          <div className="animate-pulse bg-gray-200 rounded" style={{ width: '70%', height: '70%' }}></div>
        </div>
      )}
    </>
  );
};

export default SvgToPng; 