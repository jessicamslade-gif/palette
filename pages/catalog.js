import { useEffect, useState } from 'react';

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

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

  async function saveDetail(linkId, field, value) {
    await fetch(`/api/links/${linkId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
  }

  if (!links) return <div className="container"><p className="muted">Loading…</p></div>;

  return (
    <div className="container">
      <a href="/" className="back-link">← All projects</a>

      <div className="project-header">
        <h1>General Catalog</h1>
      </div>
      <p className="muted" style={{ marginTop: -14, marginBottom: 24 }}>
        Every item you've saved, across all projects.
      </p>

      <div className="link-grid">
        {links.map((link) => (
          <div key={link.id} className="link-card">
            {link.image_url && <img src={link.image_url} alt="" />}
            {link.projects?.name && <div className="badge">{link.projects.name}</div>}
            <h3>{link.title || link.url}</h3>

            <div className="detail-row">
              <input
                className="detail-input"
                placeholder="Section"
                defaultValue={link.section || ''}
                onBlur={(e) => saveDetail(link.id, 'section', e.target.value)}
              />
              <input
                className="detail-input"
                placeholder="Price"
                defaultValue={link.price || ''}
                onBlur={(e) => saveDetail(link.id, 'price', e.target.value)}
              />
            </div>
            <div className="detail-row">
              <input
                className="detail-input"
                placeholder="Color"
                defaultValue={link.color || ''}
                onBlur={(e) => saveDetail(link.id, 'color', e.target.value)}
              />
              <input
                className="detail-input"
                placeholder="Size"
                defaultValue={link.size || ''}
                onBlur={(e) => saveDetail(link.id, 'size', e.target.value)}
              />
            </div>

            <a href={link.url} target="_blank" rel="noreferrer" className="link-url" title={link.url}>
              {hostnameOf(link.url)}
            </a>

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
          <p className="muted">Nothing saved yet.</p>
        )}
      </div>
    </div>
  );
}
