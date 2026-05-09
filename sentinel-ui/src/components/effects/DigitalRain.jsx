import { useEffect, useRef } from 'react';

export default function DigitalRain() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // Characters to use (mix of tech and symbols)
    const characters = '01ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%"\'#&_(),.;:?!\\|{}[]<>^~';
    const fontSize = 14;
    const columns = Math.floor(width / fontSize);
    
    // Position of each column
    const drops = new Array(columns).fill(0);

    const draw = () => {
      // Semi-transparent black to create trailing effect
      ctx.fillStyle = 'rgba(8, 12, 20, 0.15)';
      ctx.fillRect(0, 0, width, height);

      // Set text color and font
      ctx.fillStyle = '#00dcff33'; // Faint cyan
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        // Random character
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        
        // Randomly make some characters brighter
        if (Math.random() > 0.98) {
          ctx.fillStyle = '#00dcffcc'; // Bright cyan
        } else {
          ctx.fillStyle = '#00dcff33'; // Faint cyan
        }

        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        // Reset drop to top randomly after hitting bottom
        if (drops[i] * fontSize > height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        // Move drop down
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 50);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      // Re-init drops on resize
      const newColumns = Math.floor(width / fontSize);
      if (newColumns !== drops.length) {
        drops.length = 0;
        for (let i = 0; i < newColumns; i++) drops.push(Math.random() * height / fontSize);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="digital-rain-canvas"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.4
      }}
    />
  );
}
