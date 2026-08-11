import { useState } from 'react';
import { AppIcon3DCanvas, type IconPreset } from '@danieljamestronca/app-icon-3d';

const presets: IconPreset[] = ['ceramic', 'aluminum', 'glass'];
const snippet = `import { AppIcon3DCanvas } from '@danieljamestronca/app-icon-3d';

<AppIcon3DCanvas
  src="/my-app-icon.png"
  preset="ceramic"
  autoRotate={false}
  interactive
/>`;

export function Demo() {
  const [preset, setPreset] = useState<IconPreset>('ceramic');
  const [source, setSource] = useState('/sample-icon.svg');
  const [ready, setReady] = useState(false);
  const selectSource = (nextSource: string) => {
    setReady(false);
    setSource(nextSource);
  };
  return <main className="page-shell">
    <header className="site-header">
      <a className="wordmark" href="#top">app-icon-3d</a>
      <a className="source-link" href="https://github.com/DanielJamesTronca/app-icon-3d" target="_blank" rel="noreferrer">GitHub ↗</a>
    </header>
    <section className="hero" id="top">
      <div className="hero-copy">
        <p className="kicker">React renderer + local GLB exporter</p>
        <h1>Give your icon a body.</h1>
        <p className="intro">A small, tactile 3D treatment for the artwork you already have.</p>
        <div className="control-stack" aria-label="Preview controls">
          <div className="control-row"><span>Material</span><div className="segmented">{presets.map((value) => <button className={preset === value ? 'active' : ''} key={value} onClick={() => setPreset(value)}>{value}</button>)}</div></div>
          <div className="control-row"><span>Artwork</span><div className="segmented"><button className={source.endsWith('alt.svg') ? '' : 'active'} onClick={() => selectSource('/sample-icon.svg')}>Aurora</button><button className={source.endsWith('alt.svg') ? 'active' : ''} onClick={() => selectSource('/sample-icon-alt.svg')}>Orbit</button></div></div>
        </div>
      </div>
      <div className="stage" aria-label="Interactive 3D icon preview">
        <AppIcon3DCanvas src={source} preset={preset} quality="medium" autoRotate={false} onReady={() => setReady(true)} />
        <span className="status" aria-live="polite">{ready ? 'Drag to rotate' : 'Loading…'}</span>
      </div>
    </section>
    <section className="details" aria-label="Usage">
      <div className="detail"><p className="kicker">React</p><h2>Use the canvas, or just the object.</h2><p>Drop the renderer into React Three Fiber, or let the convenience component supply the scene.</p><pre><code>{snippet}</code></pre></div>
      <div className="detail"><p className="kicker">GLB</p><h2>Keep the file portable.</h2><p>Normalize a local PNG, JPEG, or WebP, then write a textured GLB with no camera or lighting baked in.</p><pre><code>app-icon-3d input.png --preset ceramic --out icon.glb</code></pre></div>
    </section>
  </main>;
}
