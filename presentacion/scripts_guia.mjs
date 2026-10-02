// Genera skills/PlanFin/_prompts/03_GUIA_PROMPTS.md a partir del contenido de la presentación.
import { writeFileSync } from 'node:fs';
import { PRINCIPIOS_PROMPT, SECUENCIA_PROMPTS, USO_EJEMPLOS, PROMPT_MAESTRO, PROMPTS_EJEMPLO } from './src/data/contenido.js';

let md = `# Guía: cómo pedirle a un agente que construya una buena skill

Documento generado desde la presentación "De chatbot a agente" (Planeación Financiera, MFi Uninorte). Resume las prácticas que se aplicaron al construir CDTLive y RiskLive.

## 1. Ocho reglas para pedir bien

| # | Regla | Qué significa | Ejemplo de redacción |
|---|---|---|---|
`;
PRINCIPIOS_PROMPT.forEach((p, i) => { md += `| ${i + 1} | ${p.t} | ${p.d} | "${p.cita}" |\n`; });
md += `\n## 2. La secuencia de prompts (una etapa a la vez, cada una aprobada)\n\nCambie lo que está entre corchetes.\n`;
SECUENCIA_PROMPTS.forEach((s) => { md += `\n### Etapa ${s.n}. ${s.t}\n\n${s.d}\n\n\`\`\`text\n${s.p}\n\`\`\`\n`; });
md += `\n## 3. Prompt maestro (todo en uno, para skills sencillas)\n\n\`\`\`text\n${PROMPT_MAESTRO}\n\`\`\`\n`;
md += `\n## 4. Tres prompts listos para copiar\n`;
PROMPTS_EJEMPLO.forEach((p) => { md += `\n### ${p.titulo} (${p.nivel})\n\n\`\`\`text\n${p.texto}\n\`\`\`\n`; });
md += `\n## 5. Qué pedirle a una skill ya creada\n\nEn Claude Code se invoca con \`/NombreSkill\`. En Gemini CLI y Codex basta con nombrarla ("usa la skill CDTLive para…") o preguntar algo que coincida con su descripción.\n`;
USO_EJEMPLOS.forEach((u) => { md += `\n**${u.skill}**\n\n${u.pedidos.map((q) => `- \`${q}\``).join('\n')}\n`; });
md += `\n---\nEducación financiera, no asesoría de inversión.\n`;
writeFileSync('../skills/PlanFin/_prompts/03_GUIA_PROMPTS.md', md, 'utf8');
console.log('ok', md.length);
