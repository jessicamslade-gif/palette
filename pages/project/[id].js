import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

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
    const key = link.section || 'Ungrouped';
    if (!groups[key]) groups[key] = [];
    groups[key].push(link);
  }
  const keys = Object.keys(groups).sort((a, b) => {
    if (a === 'Ungrouped') return 1;
    if (b === 'Ungrouped') return -1;
    return a.localeCompare(b);
  });
  return keys.map((key) => ({ section: key, links: groups[key] }));
}

export default function Project() {
  const router = useRouter();
  const { id } = router.query;
  const [project, setProject] = useState(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    if (!id) return;
    const res = await fetch(`/api/projects/${id}`);
    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }
    setProject(await res.json());
  }

  useEffect(() => {
    load();
  }, [id]);

  async function deleteLink(linkId) {
    await fetch(`/api/links/${linkId}`, { method: 'DELETE' });
    load();
  }

  async function deleteProject() {
    if (!confirm(`Delete "${project.name}" and all its links?`)) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    router.push('/');
  }

  async function saveDetail(linkId, field, value) {
    await fetch(`/api/links/${linkId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
  }

  function copyShareLink() {
    const url = `${window.location.origin}/share/${project.share_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!project) return <div className="container"><p className="muted">Loading…</p></div>;

  const groups = groupBySection(project.links);

  return (
    <div className="container">
      <a href="/" className="back-link">← All projects</a>

      <div className="project-header">
        <h1>{project.name}</h1>
        <div className="actions">
          <button className="button-ghost" onClick={copyShareLink}>
            {copied ? 'Copied!' : 'Copy Share Link'}
          </button>
          <a className="button" href={`/api/export/${id}`}>Export PDF</a>
          <button className="button-ghost" onClick={deleteProject}>Delete project</button>
        </div>
      </div>

      {project.links.length === 0 && (
        <p className="muted">No links yet. Save one from the Chrome extension.</p>
      )}

      {groups.map((group) => (
        <div key={group.section} className="section-group">
          <h2 className="section-heading">
            {group.section} <span className="muted">({group.links.length})</span>
          </h2>
          <div className="link-grid">
            {group.links.map((link) => (
              <div key={link.id} className="link-card">
                {link.image_url && <img src={link.image_url} alt="" />}
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
                <button className="remove-btn" onClick={() => deleteLink(link.id)}>Remove</button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
