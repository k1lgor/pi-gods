export default function hello(name) {
  if (name === "") return "Hello, !";
  return `Hello, ${name || "World"}!`;
}

// Detect direct execution (works cross-platform)
const isCli = process.argv[1]?.endsWith("hello.js") || process.argv[1]?.endsWith("hello");
if (isCli) {
  console.log(hello(process.argv[2]));
}
