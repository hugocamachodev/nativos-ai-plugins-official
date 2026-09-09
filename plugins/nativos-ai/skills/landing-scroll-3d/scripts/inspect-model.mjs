// Lista materiales, texturas y nodos de un GLB. Ejecutar desde la raíz del proyecto (necesita @gltf-transform/cli como devDependency):
//   node scripts/inspect-model.mjs public/models/model.glb
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();
console.log('--- MATERIALS ---');
for (const m of root.listMaterials()) {
  const c = m.getBaseColorFactor().map(v=>v.toFixed(2)).join(',');
  const ex = m.listExtensions().map(e=>e.extensionName.replace('KHR_materials_','')).join('+');
  const tex = ['BaseColor','MetallicRoughness','Normal','Emissive','Occlusion'].filter(k=>m[`get${k}Texture`]()).join('/');
  console.log(`${m.getName().padEnd(40)} rgba(${c}) metal=${m.getMetallicFactor().toFixed(2)} rough=${m.getRoughnessFactor().toFixed(2)} alpha=${m.getAlphaMode()} ${ex} tex:${tex}`);
}
console.log('--- TEXTURES ---');
for (const t of root.listTextures()) { const s=t.getSize(); console.log(`${(t.getName()||t.getURI()).padEnd(40)} ${s?.[0]}x${s?.[1]} ${t.getMimeType()} ${(t.getImage()?.byteLength/1e6).toFixed(1)}MB`); }
console.log('--- NODES w/ mesh (name -> material, verts) ---');
for (const n of root.listNodes()) { const mesh=n.getMesh(); if(!mesh) continue; for (const p of mesh.listPrimitives()){ const mat=p.getMaterial()?.getName(); const v=p.getAttribute('POSITION')?.getCount(); console.log(`${n.getName().padEnd(36)} -> ${String(mat).padEnd(36)} ${v}`);} }
