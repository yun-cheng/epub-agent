export function toMarkdown(highlights) {
  if (!highlights || highlights.length === 0) return '# Highlights & Notes\n\n_(no highlights yet)_\n';

  const lines = ['# Highlights & Notes\n'];
  highlights.forEach((hl, i) => {
    lines.push(`## ${i + 1}. ${hl.chapter || 'Unknown chapter'}`);
    lines.push('');
    lines.push(`> ${(hl.text || '').replace(/\n/g, '\n> ')}`);
    if (hl.note) {
      lines.push('');
      lines.push(`**Note:** ${hl.note}`);
    }
    if (hl.color) lines.push(`\n_Color: ${hl.color}_`);
    lines.push('');
    lines.push('---');
    lines.push('');
  });
  return lines.join('\n');
}

export function toJSON(highlights) {
  return JSON.stringify(highlights || [], null, 2);
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAs(format, highlights, bookTitle) {
  const slug = (bookTitle || 'highlights').replace(/[^a-z0-9]/gi, '-').toLowerCase();
  if (format === 'json') {
    downloadFile(toJSON(highlights), `${slug}-highlights.json`, 'application/json');
  } else if (format === 'markdown') {
    downloadFile(toMarkdown(highlights), `${slug}-highlights.md`, 'text/markdown');
  }
}
