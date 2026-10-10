import { useRef, useState } from 'react';

// Shrinks and converts any picked image to a JPEG in the browser before
// upload. That keeps uploads small and guarantees the PDF can embed it.
async function toJpegBase64(file, maxSize = 1400) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
}

// Shows a link's image. If there is none (or it fails to load), shows a
// placeholder instead, with an upload button unless readOnly.
export default function ImageSlot({ link, onChanged, readOnly = false }) {
  const inputRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const data = await toJpegBase64(file);
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_id: link.id, data }),
      });
      if (!res.ok) throw new Error('upload failed');
      setFailed(false);
      if (onChanged) onChanged();
    } catch (err) {
      setError("Couldn't use that file. Try a JPG or PNG.");
    }
    setUploading(false);
  }

  const picker = !readOnly && (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      style={{ display: 'none' }}
      onChange={handleFile}
    />
  );

  if (link.image_url && !failed) {
    return (
      <>
        <img src={link.image_url} alt="" onError={() => setFailed(true)} />
        {!readOnly && (
          <div className="image-replace-row">
            <button
              type="button"
              className="image-replace-btn"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? 'Uploading…' : 'Replace image'}
            </button>
            {error && <span className="image-error">{error}</span>}
            {picker}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="image-placeholder">
      <span className="image-placeholder-text">No image</span>
      {!readOnly && (
        <>
          <button
            type="button"
            className="image-upload-btn"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? 'Uploading…' : 'Upload image'}
          </button>
          {picker}
          {error && <span className="image-error">{error}</span>}
        </>
      )}
    </div>
  );
}
