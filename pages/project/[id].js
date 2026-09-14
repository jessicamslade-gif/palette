import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function Project() {
  const router = useRouter();
  const { id } = router.query;
  const [project, setProject] = useState(null);

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

  if (!project) return <div className="container"><p className="muted">Loading…</p></div>;

  return (
    <div className="container">
      <a href="/" className="back-link">← All projects</a>

      <div className="project-header">
        <h1>{project.name}</h1>
        <div className="actions">
          <a className="button" href={`/api/export/${id}`}>Export PDF</a>
          <button className="button-ghost" onClick={deleteProject}>Delete project</button>
        </div>
      </div>

      <div className="link-grid">
        {project.links.map((link) => (
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
            <button className="remove-btn" onClick={() => deleteLink(link.id)}>Remove</button>
          </div>
        ))}
        {project.links.length === 0 && (
          <p className="muted">No links yet. Save one from the Chrome extension.</p>
        )}
      </div>
    </div>
  );
}
