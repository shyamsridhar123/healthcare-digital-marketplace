function renderUnsafePreview(rawHtml) {
  const preview = document.getElementById("preview")
  preview.innerHTML = rawHtml
}

window.renderUnsafePreview = renderUnsafePreview
