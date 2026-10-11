import { useEffect, useState } from 'react';
import ImageSlot from '../components/ImageSlot';

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function groupBySection(links) {
  const groups = {};
  for (const link of links) {
    const key = link.section || 'No section';
    if (!groups[key]) groups[key] = [];
    groups[key].push(link);
  }
  const keys = Object.keys(groups).sort((a, b) => {
    if (a === 'No section') return 1;
    if (b === 'No section') return -1;
    return a.localeCompare(b);
  });
  return keys.map((key) => ({ section: key, links: groups[key] }));
}

function AssignControl({ link, projects, apiUrl, onAssigned }) {
  const [projectId, setProjectId] = useState('');
  const [section, setSection] = useState('');
  const [sections, setSections] = useState([]);
  const [saving, setSaving] = useState(false);

  async function handleProjectChange(e) {
    const pid = e.target.value;
    setProjectId(pid);
    setSection('');
    setSections([]);
    if (!pid) return;
    const res = await fetch(`/api/projects/${pid}`);
    if (res.ok) {
      const project = await res.json();
      const uniqueSections = [...new Set((project.links || []).map((l) => l.section).filter(Boolean))];
      setSections(uniqueSections);
    }
  }

  async function handleAssign() {
    if (!projectId) return;
    setSaving(true);
    await fetch(`/api/links/${link.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, section: section || null }),
    });
    setSaving(false);
    onAssigned();
  }

  return (
    <div className="assign-control">
      <select value={projectId} onChange={handleProjectChange}>
        <option value="">Add to project…</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      {projectId && (
        <>
          <input
            list={`sections-${link.id}`}
            placeholder="Section (optional)"
            value={section}
            onChange={(e) => setSection(e.target.value)}
          />
          <datalist id={`sections-${link.id}`}>
            {sections.map((s) => <option key={s} value={s} />)}
          </datalist>
          <button className="button-ghost" disabled={saving} onClick={handleAssign}>
            {saving ? 'Adding…' : 'Add'}
          </button>
        </>
      )}
    </div>
  );
}

export default function GeneralCatalog() {
  const [links, setLinks] = useState(null);
  const [projects, setProjects] = useState([]);

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

  async function deleteLink(linkId) {
    if (!confirm('Permanently delete this item from your catalog?')) return;
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

      {groupBySection(links).map((group) => (
        <div key={group.section} className="section-group">
          <h2 className="section-heading">
            {group.section} <span className="muted">({group.links.length})</span>
          </h2>
          <div className="link-grid">
        {group.links.map((link) => (
          <div key={link.id} className="link-card">
            <ImageSlot link={link} onChanged={load} />
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

            <AssignControl link={link} projects={projects} onAssigned={load} />

            <button className="remove-btn" onClick={() => deleteLink(link.id)}>Delete permanently</button>
          </div>
        ))}
          </div>
        </div>
      ))}
      <div className="link-grid">
        {links.length === 0 && (
          <p className="muted">Nothing saved yet.</p>
        )}
      </div>
    </div>
  );
}
