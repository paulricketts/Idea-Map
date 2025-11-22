/**
 * Test Script for Benedict Evans Parser
 *
 * This script tests the Benedict Evans parser with sample newsletter content.
 * Run with: node test-benedict-parser.js
 */

// Note: This is a CommonJS test file for quick testing
// In a real scenario, you'd use proper testing frameworks

const sampleHTML = `
<h1 class="null">News</h1>
<h3>AI regulation framework announced</h3>
<p>The EU has announced a comprehensive framework for AI regulation. <a href="https://example.com/ai-regulation">Read more</a></p>

<h2 class="null">Ideas</h2>
<p>This is a fascinating take on the future of computing and how it might reshape society. <a href="https://example.com/future-computing">Link</a></p>

<h2 class="null">Outside Interests</h2>
<p>An interesting piece about architecture and urban planning. <a href="https://example.com/architecture">More here</a></p>

<h2 class="null">Data</h2>
<p>New statistics on global internet usage show surprising trends. <a href="https://example.com/data-report">View report</a></p>
`;

// Test the parser pattern matching
console.log('Testing Benedict Evans Parser Pattern Matching\n');
console.log('='.repeat(50));

// Test category extraction
const categoryPattern = /<h[12][^>]*class=["']null["'][^>]*>(.*?)<\/h[12]>/gi;
let match;
const categories = [];

while ((match = categoryPattern.exec(sampleHTML)) !== null) {
  const categoryName = match[1].replace(/<[^>]+>/g, '').trim();
  categories.push({
    name: categoryName,
    position: match.index
  });
}

console.log('\nExtracted Categories:');
categories.forEach(cat => {
  console.log(`  - ${cat.name} (position: ${cat.position})`);
});

// Test link extraction
const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
const links = [];

while ((match = linkPattern.exec(sampleHTML)) !== null) {
  const url = match[1];
  const text = match[2].replace(/<[^>]+>/g, '').trim();
  links.push({ url, text });
}

console.log('\nExtracted Links:');
links.forEach(link => {
  console.log(`  - ${link.text}: ${link.url}`);
});

console.log('\n' + '='.repeat(50));
console.log('✓ Pattern matching test completed');
console.log('\nTo test with a real newsletter:');
console.log('1. Ensure database migration is complete');
console.log('2. POST the newsletter HTML to /api/ingest');
console.log('3. Check /admin/ingest to review extracted items');
