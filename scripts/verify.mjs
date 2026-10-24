import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const requiredFiles = [
  "SUNO_PROMPT_PROTOCOL.md",
  "docs/modelo-documento-reutilizavel-suno.md",
  "skills/reverse-engineer-musical-structure/SKILL.md",
  "scripts/validate-suno-prompt.mjs",
  "scripts/check-domain-boundary.mjs",
];

let failed = false;
for (const file of requiredFiles) {
  if (!existsSync(file)) {
    console.error(`FAIL: arquivo obrigatório ausente: ${file}`);
    failed = true;
  } else {
    console.log(`OK: ${file}`);
  }
}

if (!failed) {
  const protocol = readFileSync("SUNO_PROMPT_PROTOCOL.md", "utf8");
  const skill = readFileSync("skills/reverse-engineer-musical-structure/SKILL.md", "utf8");
  const template = readFileSync("docs/modelo-documento-reutilizavel-suno.md", "utf8");
  const checks = [
    ["protocolo exige documento reutilizável", /documento Markdown reutilizável/i.test(protocol)],
    ["protocolo define limite de 850 caracteres", /850 caracteres/i.test(protocol)],
    ["skill exige documento reutilizável", /documento reutilizável/i.test(skill)],
    ["modelo inclui seção de prompt SUNO", /Prompt final para SUNO AI/i.test(template)],
  ];
  for (const [label, ok] of checks) {
    console.log(`${ok ? "OK" : "FAIL"}: ${label}`);
    if (!ok) failed = true;
  }
}

function run(command, args, label) {
  console.log(`\n> ${label}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.error) {
    console.error(result.error.message);
    failed = true;
  } else if (result.status !== 0) {
    console.error(`FAIL: ${label} (código ${result.status})`);
    failed = true;
  }
}

if (!failed) {
  run(process.execPath, ["scripts/validate-suno-prompt.mjs", "Prompt de teste: piano, voz suave e crescendo cinematográfico."], "validar prompt válido");
  run(process.execPath, ["-e", "import { spawnSync } from 'node:child_process'; const p='x'.repeat(851); const r=spawnSync(process.execPath,['scripts/validate-suno-prompt.mjs',p],{encoding:'utf8'}); if(r.status===0){console.error('FAIL: prompt de 851 caracteres foi aceito');process.exit(1)} console.log('OK: prompt de 851 caracteres rejeitado');"], "confirmar limite de 850 caracteres");
  run("npm", ["test"], "testes automatizados");
  run("npm", ["run", "check"], "verificações estáticas e limites de domínio");
}

if (failed) {
  console.error("\nVERIFICAÇÃO FALHOU. Corrija os itens acima e execute npm run verify novamente.");
  process.exit(1);
}
console.log("\nVERIFICAÇÃO CONCLUÍDA COM SUCESSO.");
