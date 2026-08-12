import { useMemo, useRef, useState } from 'react';
import {
  AppIcon3DCanvas,
  AppIcon3DCollection,
  useAppIcon3DCollection,
  type AppIcon3DCollectionItem,
  type AppIcon3DCollectionStats,
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

const featuredCollectionItems: AppIcon3DCollectionItem[] = [
  { id: 'aurora', src: '/sample-icon.svg', edgeColor: '#5e6fff' },
  { id: 'orbit', src: '/sample-icon-alt.svg', edgeColor: '#d467ff' },
  { id: 'aurora-glass', src: '/sample-icon.svg', edgeColor: '#8091ff', preset: 'glass' },
  { id: 'orbit-metal', src: '/sample-icon-alt.svg', edgeColor: '#ba74dd', preset: 'aluminum' }
];
const collectionItems: AppIcon3DCollectionItem[] = [
  ...featuredCollectionItems,
  ...Array.from({ length: 46 }, (_, index) => ({
    id: `app-${index + 5}`,
    src: index % 2 === 0 ? '/sample-icon.svg' : '/sample-icon-alt.svg',
    preset: presets[index % presets.length],
    scale: 0.9 + (index % 3) * 0.04
  }))
];

function CollectionDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const collection = useAppIcon3DCollection(collectionItems);
  const [readyIds, setReadyIds] = useState(() => new Set<string | number>());
  const [selected, setSelected] = useState<string | number | null>(null);
  const [stats, setStats] = useState<AppIcon3DCollectionStats>();

  return (
    <section className="collection-section" aria-labelledby="collection-heading">
      <div className="collection-copy">
        <p className="eyebrow">50 icons · one WebGL context</p>
        <h2 id="collection-heading">A collection, not a pile of canvases.</h2>
        <p>
          Keep your cards, labels, links, and responsive layout in the DOM. One shared renderer
          mirrors every marked icon slot and pauses when the collection leaves the viewport.
        </p>
      </div>

      <div ref={containerRef} className="collection-stage" data-testid="icon-collection">
        <div className="collection-grid">
          {collectionItems.map((item) => {
            const ready = readyIds.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={selected === item.id ? 'collection-card selected' : 'collection-card'}
                aria-label={`Select ${item.id}`}
                onClick={() => setSelected(item.id)}
              >
                <span
                  className="collection-icon-slot"
                  {...collection.getSlotProps(item.id)}
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
          motions={collection.motions}
          shadow={{ opacity: 0.18 }}
          onRenderStats={setStats}
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
      <span className="visually-hidden" data-testid="grid-stats">
        {stats ? `${stats.visibleItems} of ${stats.totalItems} mounted` : 'Measuring grid'}
      </span>
    </section>
  );
}

const requestedScaleCount =
  typeof window === 'undefined'
    ? 100
    : Number(new URLSearchParams(window.location.search).get('items') ?? 100);
const scaleCount = [20, 50, 100].includes(requestedScaleCount) ? requestedScaleCount : 100;
const scalableItems: AppIcon3DCollectionItem[] = Array.from({ length: scaleCount }, (_, index) => ({
  id: `scalable-${index}`,
  src: index % 2 === 0 ? '/sample-icon.svg' : '/sample-icon-alt.svg',
  preset: presets[index % presets.length],
  scale: 0.88 + (index % 3) * 0.04
}));

function ScalableListDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const collection = useAppIcon3DCollection(scalableItems);
  const [stats, setStats] = useState<AppIcon3DCollectionStats>();
  const [scrollTop, setScrollTop] = useState(0);
  const rowHeight = 112;
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - 2);
  const end = Math.min(scalableItems.length, start + 10);
  const rows = useMemo(() => scalableItems.slice(start, end), [start, end]);

  return (
    <section className="collection-section scale-section" aria-labelledby="scale-heading">
      <div className="collection-copy">
        <p className="eyebrow">{scalableItems.length}-item scale target</p>
        <h2 id="scale-heading">A long list, one bounded renderer.</h2>
        <p>
          The virtualized DOM models all {scalableItems.length} rows. Only mounted icons intersecting this scrollport plus overscan
          allocate meshes and textures.
        </p>
      </div>
      <div
        ref={viewportRef}
        className="scale-viewport"
        data-testid="scale-viewport"
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <div
          ref={containerRef}
          className="scale-list"
          data-testid="scale-list"
          style={{ '--scale-items': scalableItems.length } as React.CSSProperties}
        >
          {rows.map((item, visibleIndex) => {
            const index = start + visibleIndex;
            return <article className="scale-row" key={item.id} style={{ top: index * rowHeight }}>
              <span className="scale-slot" {...collection.getSlotProps(item.id)}>
                <img className="collection-fallback" src={item.src} alt="" />
              </span>
              <span>
                <strong>Icon {String(index + 1).padStart(3, '0')}</strong>
                <small>{item.preset} · consumer-owned row</small>
              </span>
            </article>;
          })}
          <AppIcon3DCollection
            containerRef={containerRef}
            viewportRef={viewportRef}
            items={scalableItems}
            motions={collection.motions}
            geometry={{ quality: 'low' }}
            overscan={96}
            maxTextureSize={512}
            shadow={false}
            onRenderStats={setStats}
          />
        </div>
      </div>
      <p className="collection-status" data-testid="scale-stats">
        {stats
          ? `${stats.visibleItems} of ${stats.totalItems} 3D icons mounted · ${Math.round(stats.canvasWidth)}×${Math.round(stats.canvasHeight)} canvas`
          : 'Measuring visible icons…'}
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
      <ScalableListDemo />

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
