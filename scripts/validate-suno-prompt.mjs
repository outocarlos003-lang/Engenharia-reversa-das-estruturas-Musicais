const prompt = process.argv.slice(2).join(' ');
const length = Array.from(prompt).length;
if (!prompt.trim()) {
  console.error('ERRO: informe o prompt como argumento.');
  process.exit(1);
}
if (length > 850) {
  console.error(`ERRO: ${length} caracteres; o máximo permitido é 850.`);
  process.exit(1);
}
console.log(`OK: prompt válido com ${length}/850 caracteres.`);
