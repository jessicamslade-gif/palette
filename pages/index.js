import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/projects');
    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }
    setProjects(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createProject(e) {
    e.preventDefault();
    if (!name.trim()) return;
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setName('');
    load();
  }

  return (
    <div className="container">
      <div className="header-row">
        <h1>My Link Catalog</h1>
        <a href="/catalog" className="button-ghost">General Catalog</a>
      </div>

      <form onSubmit={createProject} className="inline-form">
        <input
          placeholder="New project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit">Create project</button>
      </form>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="grid">
          {projects.map((p) => (
            <Link key={p.id} href={`/project/${p.id}`} className="project-card">
              <h2>{p.name}</h2>
              <p className="muted">
                {p.link_count} item{p.link_count === 1 ? '' : 's'}
              </p>
            </Link>
          ))}
          {projects.length === 0 && (
            <p className="muted">No projects yet — create one above.</p>
          )}
        </div>
      )}
    </div>
  );
}
