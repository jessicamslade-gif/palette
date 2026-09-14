import { useEffect, useState } from 'react';

export default function GeneralCatalog() {
  const [links, setLinks] = useState(null);
  const [projects, setProjects] = useState([]);
  const [movingId, setMovingId] = useState(null);

  async function load() {
    const [linksRes, projectsRes] = await Promise.all([
      fetch('/api/links'),
      fetch('/api/projects'),
    ]);
    if (linksRes.status === 401) {
      window.location.href = '/login';
      return;
    }
    setLinks(await linksRes.json());
    setProjects(await projectsRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function moveToProject(linkId, projectId) {
    if (!projectId) return;
    setMovingId(linkId);
    await fetch(`/api/links/${linkId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId }),
    });
    setMovingId(null);
    load();
  }

  async function deleteLink(linkId) {
    await fetch(`/api/links/${linkId}`, { method: 'DELETE' });
    load();
  }

  if (!links) return <div className="container"><p className="muted">Loading…</p></div>;

  return (
    <div className="container">
      <a href="/" className="back-link">← All projects</a>

      <div className="project-header">
        <h1>General Catalog</h1>
      </div>
      <p className="muted" style={{ marginTop: -14, marginBottom: 24 }}>
        Links saved without picking a project. Assign them to a project whenever you're ready.
      </p>

      <div className="link-grid">
        {links.map((link) => (
          <div key={link.id} className="link-card">
            {link.image_url && <img src={link.image_url} alt="" />}
            <h3>{link.title || link.url}</h3>
            <a href={link.url} target="_blank" rel="noreferrer" className="link-url">
              {link.url}
            </a>
            <div className="meta">
              {link.image_width && link.image_height && (
                <span>{link.image_width}×{link.image_height}px</span>
              )}
              {link.file_size_bytes && (
                <span>{(link.file_size_bytes / 1024).toFixed(0)} KB</span>
              )}
            </div>

            <select
              defaultValue=""
              disabled={movingId === link.id}
              onChange={(e) => moveToProject(link.id, e.target.value)}
              style={{ marginTop: 10 }}
            >
              <option value="" disabled>Move to project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <button className="remove-btn" onClick={() => deleteLink(link.id)}>Remove</button>
          </div>
        ))}
        {links.length === 0 && (
          <p className="muted">Nothing here yet. Save a link from the extension without picking a project to see it here.</p>
        )}
      </div>
    </div>
  );
}
