async function main() {
  const res = await fetch('http://localhost:3000/api/v1/timelines?limit=100');
  const json = await res.json();
  console.log(JSON.stringify(json.data?.[0], null, 2));
}

main();
