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

  return (
    <main className="page-shell">
      <header className="site-header">
        <a className="wordmark" href="#top">
          app-icon-3d
        </a>
        <a
          className="source-link"
          href="https://github.com/DanielJamesTronca/app-icon-3d"
          target="_blank"
          rel="noreferrer"
        >
          GitHub <span aria-hidden="true">↗</span>
        </a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <h1>Give your icon a body.</h1>
          <p className="intro">
            Render any app icon as an interactive React component, then export it as a portable GLB.
            Everything stays local.
          </p>
        </div>

        <div className="stage" aria-label="Interactive, rotating 3D icon preview">
          <AppIcon3DCanvas
            src={source}
            preset={preset}
            quality="medium"
            autoRotate
            onReady={() => setReady(true)}
          />

          <span className="status" aria-live="polite">
            {ready ? 'Drag to explore' : 'Loading…'}
          </span>

          <div className="control-dock" aria-label="Preview controls">
            <div className="control-group">
              <span className="control-label">Material</span>
              <div className="segmented">
                {presets.map((value) => (
                  <button
                    aria-pressed={preset === value}
                    className={preset === value ? 'active' : ''}
                    key={value}
                    type="button"
                    onClick={() => setPreset(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="dock-divider" aria-hidden="true" />

            <div className="control-group">
              <span className="control-label">Artwork</span>
              <div className="segmented">
                <button
                  aria-pressed={!source.endsWith('alt.svg')}
                  className={source.endsWith('alt.svg') ? '' : 'active'}
                  type="button"
                  onClick={() => selectSource('/sample-icon.svg')}
                >
                  Aurora
                </button>
                <button
                  aria-pressed={source.endsWith('alt.svg')}
                  className={source.endsWith('alt.svg') ? 'active' : ''}
                  type="button"
                  onClick={() => selectSource('/sample-icon-alt.svg')}
                >
                  Orbit
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="details" aria-label="Usage">
        <article className="detail">
          <div className="detail-heading">
            <h2>Use it in React.</h2>
            <p>
              Add the ready-made canvas, or place the 3D object inside your own React Three Fiber
              scene.
            </p>
          </div>
          <pre aria-label="React component example">
            <code>{snippet}</code>
          </pre>
        </article>

        <article className="detail">
          <div className="detail-heading">
            <h2>Take it anywhere.</h2>
            <p>
              Turn a local PNG, JPEG, or WebP into a textured GLB with no camera or lighting baked
              in.
            </p>
          </div>
          <pre aria-label="GLB export command">
            <code>app-icon-3d input.png --preset ceramic --out icon.glb</code>
          </pre>
        </article>
      </section>
    </main>
  );
}
