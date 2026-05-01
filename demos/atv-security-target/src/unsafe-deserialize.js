function loadWorkflow(serializedWorkflow) {
  return deserialize(serializedWorkflow)
}

function deserialize(value) {
  return Function(`return (${value})`)()
}

module.exports = { loadWorkflow }
