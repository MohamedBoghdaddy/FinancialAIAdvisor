// Stub for file imports (CSS, images, fonts) in jest tests.
// CRA handles CSS in src/ via its built-in transform, but CSS imported
// directly from node_modules (e.g. bootstrap/dist/css/bootstrap.min.css)
// falls through and needs this stub so jest doesn't choke on raw CSS.
module.exports = {};
