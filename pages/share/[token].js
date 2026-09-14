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

export default function SharedProject() {
  const router = useRouter();
  const { token } = router.query;
  const [project, setProject] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/share/${token}`).then(async (res) => {
      if (!res.ok) { setNotFound(true); return; }
      setProject(await res.json());
    });
  }, [token]);

  if (notFound) return <div className="container"><p className="muted">This catalog link isn't valid.</p></div>;
  if (!project) return <div className="container"><p className="muted">Loading…</p></div>;

  const groups = groupBySection(project.links);

  return (
    <div>
      <div className="brand-header">
        <img src="/logo-white.png" alt="" className="brand-logo" />
      </div>
      <div className="container">
        <div className="project-header">
          <h1>{project.name}</h1>
          <a className="button" href={`/api/export-share/${token}`}>Export PDF</a>
        </div>

        {project.links.length === 0 && <p className="muted">No items in this catalog yet.</p>}

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
                  {(link.color || link.size || link.price) && (
                    <div className="item-details">
                      {[link.color, link.size, link.price].filter(Boolean).join('  ·  ')}
                    </div>
                  )}
                  <a href={link.url} target="_blank" rel="noreferrer" className="link-url" title={link.url}>
                    {hostnameOf(link.url)}
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
