function escapeHtml(value = ''): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function applyInlineMarkdown(value = ''): string {
  return value
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

export function renderMarkdown(input = ''): string {
  if (!input) {
    return '<p>No content.</p>'
  }

  const lines = escapeHtml(input).split(/\r?\n/)
  const chunks: string[] = []
  let inList = false

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      if (inList) {
        chunks.push('</ul>')
        inList = false
      }
      continue
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        chunks.push('<ul>')
        inList = true
      }

      chunks.push(`<li>${applyInlineMarkdown(line.slice(2).trim())}</li>`)
      continue
    }

    if (inList) {
      chunks.push('</ul>')
      inList = false
    }

    if (line.startsWith('### ')) {
      chunks.push(`<h3>${applyInlineMarkdown(line.slice(4))}</h3>`)
      continue
    }

    if (line.startsWith('## ')) {
      chunks.push(`<h2>${applyInlineMarkdown(line.slice(3))}</h2>`)
      continue
    }

    if (line.startsWith('# ')) {
      chunks.push(`<h1>${applyInlineMarkdown(line.slice(2))}</h1>`)
      continue
    }

    if (line.startsWith('> ')) {
      chunks.push(`<blockquote>${applyInlineMarkdown(line.slice(2))}</blockquote>`)
      continue
    }

    chunks.push(`<p>${applyInlineMarkdown(rawLine)}</p>`)
  }

  if (inList) {
    chunks.push('</ul>')
  }

  return chunks.join('')
}
