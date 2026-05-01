const serialize = require("serialize-javascript")

function renderCasePreview(req, res) {
  const rawHtml = req.body.rawHtml || ""
  const serializedCase = serialize(req.body.case || {})

  res.send(`
    <html>
      <head>
        <script src="https://cdn.example.invalid/chart.js"></script>
      </head>
      <body>
        <section id="preview">${rawHtml}</section>
        <script>window.__CASE__ = ${serializedCase}</script>
      </body>
    </html>
  `)
}

module.exports = { renderCasePreview }
