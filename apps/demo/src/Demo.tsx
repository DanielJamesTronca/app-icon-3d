import { useRef, useState } from 'react';
import {
  AppIcon3DCanvas,
  AppIcon3DCollection,
  createIconMotion,
  useIconPointer,
  type AppIcon3DCollectionItem,
  type IconMotion,
  type IconPreset
} from '@danieljamestronca/app-icon-3d';

const presets: IconPreset[] = ['ceramic', 'aluminum', 'glass'];
const snippet = `import { AppIcon3DCanvas } from '@danieljamestronca/app-icon-3d';

<AppIcon3DCanvas
  src="/my-app-icon.png"
  preset="ceramic"
  autoRotate={false}
  interactive
/>`;

const collectionItems: AppIcon3DCollectionItem[] = [
  { id: 'aurora', src: '/sample-icon.svg', edgeColor: '#5e6fff' },
  { id: 'orbit', src: '/sample-icon-alt.svg', edgeColor: '#d467ff' },
  { id: 'aurora-glass', src: '/sample-icon.svg', edgeColor: '#8091ff', preset: 'glass' },
  { id: 'orbit-metal', src: '/sample-icon-alt.svg', edgeColor: '#ba74dd', preset: 'aluminum' }
];

function CollectionDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [motions] = useState(
    () => new Map(collectionItems.map((item, index) => [item.id, createIconMotion(index * 1.17)]))
  );
  const pointer = useIconPointer();
  const [readyIds, setReadyIds] = useState(() => new Set<string | number>());
  const [selected, setSelected] = useState<string | number | null>(null);

  return (
    <section className="collection-section" aria-labelledby="collection-heading">
      <div className="collection-copy">
        <p className="eyebrow">One WebGL context</p>
        <h2 id="collection-heading">A collection, not a pile of canvases.</h2>
        <p>
          Keep your cards, labels, links, and responsive layout in the DOM. One shared renderer
          mirrors every marked icon slot and pauses when the collection leaves the viewport.
        </p>
      </div>

      <div ref={containerRef} className="collection-stage" data-testid="icon-collection">
        <div className="collection-grid">
          {collectionItems.map((item) => {
            const motion = motions.get(item.id) as IconMotion;
            const ready = readyIds.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={selected === item.id ? 'collection-card selected' : 'collection-card'}
                aria-label={`Select ${item.id}`}
                onClick={() => {
                  if (!pointer.consumeClick(motion)) setSelected(item.id);
                }}
              >
                <span
                  className="collection-icon-slot"
                  data-app-icon-id={item.id}
                  onPointerEnter={() => pointer.onPointerEnter(motion)}
                  onPointerLeave={() => pointer.onPointerLeave(motion)}
                  onPointerDown={(event) => pointer.onPointerDown(event, motion)}
                  onPointerMove={(event) => pointer.onPointerMove(event, motion)}
                  onPointerUp={(event) => pointer.onPointerUp(event, motion)}
                  onPointerCancel={() => pointer.onPointerCancel(motion)}
                >
                  <img
                    src={item.src}
                    alt=""
                    className="collection-fallback"
                    style={{ opacity: ready ? 0 : 1 }}
                  />
                </span>
                <span>{String(item.id).replace('-', ' ')}</span>
              </button>
            );
          })}
        </div>

        <AppIcon3DCollection
          containerRef={containerRef}
          items={collectionItems}
          motions={motions}
          shadow={{ opacity: 0.18 }}
          onItemReady={(id) => {
            setReadyIds((current) => {
              if (current.has(id)) return current;
              const next = new Set(current);
              next.add(id);
              return next;
            });
          }}
        />
      </div>
      <p className="collection-status" aria-live="polite">
        {selected
          ? `Selected ${String(selected).replace('-', ' ')}`
          : 'Drag an icon or select a card'}
      </p>
    </section>
  );
}

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

      <CollectionDemo />

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
