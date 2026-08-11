import { useState } from 'react';
import { AppIcon3DCanvas, type IconPreset } from '@danieljamestronca/app-icon-3d';

const presets: IconPreset[] = ['ceramic', 'aluminum', 'glass'];
const snippet = `import { AppIcon3DCanvas } from '@danieljamestronca/app-icon-3d';

<AppIcon3DCanvas
  src="/my-app-icon.png"
  preset="ceramic"
  autoRotate
  interactive
/>`;

export function Demo() {
  const [preset, setPreset] = useState<IconPreset>('ceramic');
  const [source, setSource] = useState('/sample-icon.svg');
  const [ready, setReady] = useState(false);
  return <main>
    <section className="hero">
      <p className="eyebrow">open-source • local-first • MIT</p>
      <h1>App icons, with a little more dimension.</h1>
      <p className="intro">A polished React renderer and CLI exporter for turning the artwork you already own into tactile 3D objects.</p>
      <div className="stage" aria-label="Interactive 3D icon preview">
        <AppIcon3DCanvas src={source} preset={preset} quality="high" onReady={() => setReady(true)} />
        <span className="status" aria-live="polite">{ready ? 'Ready — drag to explore' : 'Loading texture…'}</span>
      </div>
      <div className="controls" aria-label="Preview controls">
        <div className="control-group"><span>Material</span>{presets.map((value) => <button className={preset === value ? 'active' : ''} key={value} onClick={() => setPreset(value)}>{value}</button>)}</div>
        <div className="control-group"><span>Artwork</span><button className={source.endsWith('alt.svg') ? '' : 'active'} onClick={() => setSource('/sample-icon.svg')}>Aurora</button><button className={source.endsWith('alt.svg') ? 'active' : ''} onClick={() => setSource('/sample-icon-alt.svg')}>Orbit</button></div>
      </div>
    </section>
    <section className="details">
      <div><p className="eyebrow">React</p><h2>Drop into a Canvas—or don’t.</h2><p>Use <code>AppIcon3D</code> inside your existing React Three Fiber canvas, or use the convenience canvas shown here. Motion respects the system reduced-motion preference.</p><pre><code>{snippet}</code></pre></div>
      <div><p className="eyebrow">GLB export</p><h2>Portable by default.</h2><p>The CLI normalizes PNG, JPEG, and WebP locally, samples an edge color, and exports a textured PBR GLB without lights or a camera.</p><pre><code>app-icon-3d input.png --preset ceramic --out icon.glb</code></pre><a href="https://github.com/DanielJamesTronca/app-icon-3d#cli" target="_blank" rel="noreferrer">Read CLI docs →</a></div>
    </section>
  </main>;
}
