import { useEffect, useRef } from 'react';

export default function FireworksCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, animId;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    const COLORS = ['#FFD700','#FF4500','#FF69B4','#00CFFF','#ADFF2F',
                    '#FF6347','#FFA500','#E040FB','#40C4FF','#FFEB3B',
                    '#FF1744','#76FF03','#FF9100','#EA80FC','#18FFFF'];

    const stars = Array.from({ length: 140 }, () => ({
      x: Math.random() * 2000, y: Math.random() * 1200,
      r: Math.random() * 1.4 + 0.3,
      a: Math.random(),
      da: (Math.random() * 0.008 + 0.003) * (Math.random() < 0.5 ? 1 : -1)
    }));

    class Particle {
      constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1.5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1;
        this.decay = Math.random() * 0.018 + 0.012;
        this.r = Math.random() * 2.5 + 1;
        this.gravity = 0.06;
      }
      update() {
        this.x += this.vx; this.y += this.vy;
        this.vy += this.gravity;
        this.vx *= 0.98; this.vy *= 0.98;
        this.life -= this.decay;
      }
      draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life) * 0.9;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    class Rocket {
      constructor() { this.reset(); }
      reset() {
        this.x = W * 0.1 + Math.random() * W * 0.8;
        this.y = H;
        this.tx = W * 0.1 + Math.random() * W * 0.8;
        this.ty = H * 0.1 + Math.random() * H * 0.45;
        const dx = this.tx - this.x, dy = this.ty - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = Math.random() * 6 + 7;
        this.vx = dx / dist * speed; this.vy = dy / dist * speed;
        this.trail = []; this.exploded = false;
        this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      }
      update() {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 18) this.trail.shift();
        this.x += this.vx; this.y += this.vy; this.vy += 0.12;
        if ((this.vy >= 0 && this.y > this.ty) || this.y < this.ty) {
          this.exploded = true; burst(this.x, this.y, this.color);
        }
      }
      draw() {
        for (let i = 0; i < this.trail.length; i++) {
          ctx.save(); ctx.globalAlpha = (i / this.trail.length) * 0.6;
          ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 4;
          ctx.beginPath(); ctx.arc(this.trail[i].x, this.trail[i].y, 1.5, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        ctx.save(); ctx.globalAlpha = 0.95; ctx.fillStyle = this.color;
        ctx.shadowColor = '#fff'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    function burst(x, y, baseColor) {
      const count = 80 + Math.floor(Math.random() * 60);
      for (let i = 0; i < count; i++) {
        const c = Math.random() < 0.3 ? COLORS[Math.floor(Math.random() * COLORS.length)] : baseColor;
        particles.push(new Particle(x, y, c));
      }
      for (let i = 0; i < 20; i++) {
        const a = i / 20 * Math.PI * 2;
        const p = new Particle(x, y, '#fff');
        const spd = Math.random() * 2 + 5;
        p.vx = Math.cos(a) * spd; p.vy = Math.sin(a) * spd;
        p.r = 1.2; p.decay = 0.03; particles.push(p);
      }
    }

    let particles = [], rockets = [], lastRocket = 0;

    function loop(ts) {
      ctx.fillStyle = 'rgba(8,3,28,0.20)';
      ctx.fillRect(0, 0, W, H);
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, 'rgba(20,5,60,0.06)');
      grd.addColorStop(1, 'rgba(60,10,90,0.04)');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

      for (const s of stars) {
        s.a += s.da; if (s.a > 1 || s.a < 0) s.da *= -1;
        ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, s.a));
        ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.arc((s.x / 2000) * W, (s.y / 1200) * H, s.r, 0, Math.PI * 2);
        ctx.fill(); ctx.restore();
      }

      if (ts - lastRocket > 1200 + Math.random() * 600) {
        rockets.push(new Rocket()); lastRocket = ts;
      }
      for (let i = rockets.length - 1; i >= 0; i--) {
        rockets[i].draw(); rockets[i].update();
        if (rockets[i].exploded) rockets.splice(i, 1);
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].draw(); particles[i].update();
        if (particles[i].life <= 0) particles.splice(i, 1);
      }
      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0,
        width: '100%', height: '100%',
        zIndex: 0, pointerEvents: 'none',
        display: 'block'
      }}
    />
  );
}
