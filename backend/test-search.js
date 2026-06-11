// Test script to verify search functionality
// Run with: node backend/test-search.js

const testSearch = (productName, searchTerm) => {
  // Escape special regex characters
  const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Create regex pattern (case insensitive)
  const regex = new RegExp(escapedSearchTerm, 'i');
  
  // Test if product name matches
  const matches = regex.test(productName);
  
  console.log(`\n---`);
  console.log(`Product: "${productName}"`);
  console.log(`Search: "${searchTerm}"`);
  console.log(`Escaped: "${escapedSearchTerm}"`);
  console.log(`Regex: /${escapedSearchTerm}/i`);
  console.log(`Matches: ${matches ? '✅ YES' : '❌ NO'}`);
  
  return matches;
};

// Test cases
console.log('\n=== SEARCH FUNCTIONALITY TESTS ===');

// Test 1: Product "FormSoumettreDemande"
testSearch('FormSoumettreDemande', 'f');     // Should match
testSearch('FormSoumettreDemande', 'fo');    // Should match
testSearch('FormSoumettreDemande', 'form');  // Should match
testSearch('FormSoumettreDemande', 'FORM');  // Should match (case insensitive)
testSearch('FormSoumettreDemande', 'demande'); // Should match
testSearch('FormSoumettreDemande', 'xyz');   // Should NOT match

// Test 2: Product "Table en chêne"
testSearch('Table en chêne', 't');           // Should match
testSearch('Table en chêne', 'table');       // Should match
testSearch('Table en chêne', 'chêne');       // Should match
testSearch('Table en chêne', 'en');          // Should match
testSearch('Table en chêne', 'abc');         // Should NOT match

// Test 3: Products with accents
testSearch('Étagère', 'é');                  // Should match
testSearch('Étagère', 'e');                  // Should NOT match (different character)
testSearch('Étagère', 'tag');                // Should match

console.log('\n=== END OF TESTS ===\n');
