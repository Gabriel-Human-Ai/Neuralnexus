export function captureChooserHtml() {
  return `
    <div class="capture-grid">
      <button id="capture-selection" class="primary">Capture selection</button>
      <button id="capture-page">Capture page text</button>
      <button id="capture-screenshot">Capture screenshot</button>
    </div>
  `;
}
