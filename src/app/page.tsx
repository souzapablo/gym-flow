export default function Home() {
  return (
    <main className="shell">
      <header className="masthead">
        <span className="wordmark">Gym Flow</span>
        <span className="status">Private workspace</span>
      </header>

      <section className="empty-state" aria-labelledby="page-title">
        <p className="eyebrow">Your training, in one place</p>
        <h1 id="page-title">Start with the next session.</h1>
        <p className="intro">
          A quiet foundation for planning workouts and keeping track of what
          matters. Nothing extra yet.
        </p>
        <button type="button" disabled>
          Add your first workout
          <span aria-hidden="true">↗</span>
        </button>
        <p className="hint">The first feature will live here.</p>
      </section>

      <footer>
        <span>Built for one</span>
        <span aria-hidden="true">01</span>
      </footer>
    </main>
  );
}
