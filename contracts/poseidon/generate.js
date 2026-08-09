// Generates the EVM Poseidon contracts (t=3 for hash_2, t=5 for hash_4) used by
// InheritanceRegistry.claim to verify Merkle inclusion against the will circuit's
// Poseidon tree. Uses circomlibjs, which is byte-for-byte compatible with the
// noir-lang/poseidon the circuit uses (verified: hash_2([0,0]) matches).
//
// Run from repo root: node contracts/poseidon/generate.js
// (requires the frontend's node_modules, where circomlibjs is installed)
const path = require("path");
const fs = require("fs");
const g = require(path.join(__dirname, "../../frontend/node_modules/circomlibjs")).poseidon_gencontract;

for (const [name, nInputs] of [["PoseidonT3", 2], ["PoseidonT5", 4]]) {
  const code = g.createCode(nInputs); // 0x-prefixed init bytecode
  fs.writeFileSync(path.join(__dirname, name + ".bin"), code);
  console.log(name, "init bytecode bytes:", (code.length - 2) / 2);
}
