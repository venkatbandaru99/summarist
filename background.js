// background.js - Complete Version with Selective Import
console.log('🔧 Background starting...');

chrome.runtime.onInstalled.addListener(() => {
  console.log('📚 Extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received:', request.action);
  
  if (request.action === 'test') {
    sendResponse({success: true, message: 'Background working!'});
    return;
  }
  
  // ORIGINAL: Get bookmark count (for compatibility)
  if (request.action === 'getBookmarkCount') {
    chrome.bookmarks.getTree()
      .then(tree => {
        const count = countBookmarks(tree);
        console.log('📊 Bookmark count:', count);
        sendResponse({success: true, count});
      })
      .catch(error => {
        console.error('❌ Bookmark error:', error);
        sendResponse({success: false, error: error.message});
      });
    return true;
  }
  
  // NEW: Get bookmark tree structure for folder selection
  if (request.action === 'getBookmarkTree') {
    chrome.bookmarks.getTree()
      .then(tree => {
        console.log('📊 Bookmark tree retrieved');
        sendResponse({success: true, tree});
      })
      .catch(error => {
        console.error('❌ Bookmark tree error:', error);
        sendResponse({success: false, error: error.message});
      });
    return true;
  }
  
  // NEW: Analyze bookmark structure for selective import
  if (request.action === 'analyzeBookmarks') {
    chrome.bookmarks.getTree()
      .then(tree => {
        const analysis = analyzeBookmarkStructure(tree);
        console.log('📊 Bookmark analysis:', analysis);
        sendResponse({success: true, analysis});
      })
      .catch(error => {
        console.error('❌ Bookmark analysis error:', error);
        sendResponse({success: false, error: error.message});
      });
    return true;
  }
  
  // ORIGINAL: Import all bookmarks (for backward compatibility)
  if (request.action === 'importBookmarks') {
    console.log('📚 Starting bookmark import for user:', request.userId);
    handleBookmarkImport(request.userId)
      .then(result => {
        console.log('✅ Import completed:', result);
        sendResponse({success: true, result});
      })
      .catch(error => {
        console.error('❌ Import failed:', error);
        sendResponse({success: false, error: error.message});
      });
    return true;
  }
  
  // NEW: Import selected bookmarks only
  if (request.action === 'importSelectedBookmarks') {
    console.log('📚 Starting selective import for user:', request.userId);
    console.log('📁 Selected folders:', request.selectedFolders);
    handleSelectiveBookmarkImport(request.userId, request.selectedFolders)
      .then(result => {
        console.log('✅ Selective import completed:', result);
        sendResponse({success: true, result});
      })
      .catch(error => {
        console.error('❌ Selective import failed:', error);
        sendResponse({success: false, error: error.message});
      });
    return true;
  }
  
  // Get saved bookmarks from Firestore
  if (request.action === 'getBookmarks') {
    console.log('📖 Getting saved bookmarks for user:', request.userId);
    getBookmarksFromFirestore(request.userId)
      .then(bookmarks => {
        console.log('✅ Retrieved bookmarks:', bookmarks.length);
        sendResponse({success: true, bookmarks});
      })
      .catch(error => {
        console.error('❌ Get bookmarks failed:', error);
        sendResponse({success: false, error: error.message});
      });
    return true;
  }
  
  // Handle Firestore save requests from popup
  if (request.action === 'saveToFirestore') {
    console.log('💾 Handling Firestore save request...');
    saveToFirestoreREST(request.bookmark, request.userId)
      .then(result => sendResponse({success: true, result}))
      .catch(error => sendResponse({success: false, error: error.message}));
    return true;
  }
  
  sendResponse({success: false, error: 'Unknown action'});
});

// Helper: Count bookmarks in tree
function countBookmarks(nodes) {
  let count = 0;
  for (const node of nodes) {
    if (node.url) count++;
    if (node.children) count += countBookmarks(node.children);
  }
  return count;
}

// NEW: Analyze bookmark structure for selective import
function analyzeBookmarkStructure(bookmarkTree) {
  const folders = [];
  let totalBookmarks = 0;
  
  function analyzeFolders(nodes, path = '') {
    for (const node of nodes) {
      if (node.children) {
        // This is a folder
        const folderPath = path ? `${path}/${node.title}` : node.title;
        const bookmarkCount = countBookmarksInNode(node);
        
        if (bookmarkCount > 0) {
          folders.push({
            name: node.title,
            path: folderPath,
            count: bookmarkCount
          });
          totalBookmarks += bookmarkCount;
        }
        
        // Recurse into subfolders
        analyzeFolders(node.children, folderPath);
      }
    }
  }
  
  analyzeFolders(bookmarkTree);
  
  return {
    totalBookmarks,
    folderCount: folders.length,
    folders: folders.sort((a, b) => b.count - a.count) // Sort by bookmark count
  };
}

// Helper: Count bookmarks in a specific node
function countBookmarksInNode(node) {
  let count = 0;
  
  function countRecursive(nodes) {
    for (const childNode of nodes) {
      if (childNode.url) {
        count++;
      } else if (childNode.children) {
        countRecursive(childNode.children);
      }
    }
  }
  
  if (node.children) {
    countRecursive(node.children);
  }
  
  return count;
}

// ORIGINAL: Handle importing all bookmarks
async function handleBookmarkImport(userId) {
  try {
    console.log('📚 Getting bookmark tree...');
    const bookmarkTree = await chrome.bookmarks.getTree();
    
    console.log('🔍 Extracting bookmarks...');
    const bookmarks = extractBookmarksFromTree(bookmarkTree);
    
    console.log(`📖 Found ${bookmarks.length} bookmarks to process`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each bookmark
    for (let i = 0; i < bookmarks.length; i++) {
      const bookmark = bookmarks[i];
      console.log(`⚡ Processing ${i + 1}/${bookmarks.length}: ${bookmark.title}`);
      
      try {
        const saveResult = await saveToFirestoreREST(bookmark, userId);
        successCount++;
        console.log(`✅ Saved: ${bookmark.title}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to save: ${bookmark.title}`, error);
      }
      
      // Send progress update to popup
      chrome.runtime.sendMessage({
        action: 'importProgress',
        processed: i + 1,
        total: bookmarks.length,
        percentage: Math.round(((i + 1) / bookmarks.length) * 100)
      });
      
      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ Import complete');
    return {
      total: bookmarks.length,
      processed: bookmarks.length,
      success: successCount,
      errors: errorCount
    };
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  }
}

// NEW: Handle selective bookmark import
async function handleSelectiveBookmarkImport(userId, selectedFolderPaths) {
  try {
    console.log('📚 Getting bookmark tree for selective import...');
    const bookmarkTree = await chrome.bookmarks.getTree();
    
    console.log('🔍 Extracting bookmarks from selected folders...');
    const bookmarks = extractBookmarksFromSelectedFolders(bookmarkTree, selectedFolderPaths);
    
    console.log(`📖 Found ${bookmarks.length} bookmarks in selected folders`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each bookmark
    for (let i = 0; i < bookmarks.length; i++) {
      const bookmark = bookmarks[i];
      console.log(`⚡ Processing ${i + 1}/${bookmarks.length}: ${bookmark.title}`);
      
      try {
        const saveResult = await saveToFirestoreREST(bookmark, userId);
        successCount++;
        console.log(`✅ Saved: ${bookmark.title}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to save: ${bookmark.title}`, error);
      }
      
      // Send progress update to popup
      chrome.runtime.sendMessage({
        action: 'importProgress',
        processed: i + 1,
        total: bookmarks.length,
        percentage: Math.round(((i + 1) / bookmarks.length) * 100)
      });
      
      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ Selective import complete');
    return {
      total: bookmarks.length,
      processed: bookmarks.length,
      success: successCount,
      errors: errorCount,
      selectedFolders: selectedFolderPaths.length
    };
    
  } catch (error) {
    console.error('❌ Selective import failed:', error);
    throw error;
  }
}

// ORIGINAL: Extract all bookmarks from tree
function extractBookmarksFromTree(nodes, folder = '') {
  const bookmarks = [];
  
  for (const node of nodes) {
    if (node.url) {
      bookmarks.push({
        id: node.id,
        title: node.title || 'Untitled',
        url: node.url,
        folder: folder,
        dateAdded: node.dateAdded ? new Date(node.dateAdded) : new Date()
      });
    }
    
    if (node.children) {
      const folderName = folder ? `${folder}/${node.title}` : node.title;
      const childBookmarks = extractBookmarksFromTree(node.children, folderName);
      bookmarks.push(...childBookmarks);
    }
  }
  
  return bookmarks;
}

// NEW: Extract bookmarks from selected folders only
function extractBookmarksFromSelectedFolders(bookmarkTree, selectedFolderPaths) {
  const bookmarks = [];
  
  function extractFromNodes(nodes, currentPath = '') {
    for (const node of nodes) {
      if (node.url) {
        // This is a bookmark - check if its folder is selected
        if (selectedFolderPaths.some(selectedPath => 
            currentPath === selectedPath || 
            currentPath.startsWith(selectedPath + '/'))) {
          bookmarks.push({
            id: node.id,
            title: node.title || 'Untitled',
            url: node.url,
            folder: currentPath,
            dateAdded: node.dateAdded ? new Date(node.dateAdded) : new Date()
          });
        }
      } else if (node.children) {
        // This is a folder
        const folderPath = currentPath ? `${currentPath}/${node.title}` : node.title;
        extractFromNodes(node.children, folderPath);
      }
    }
  }
  
  extractFromNodes(bookmarkTree);
  
  return bookmarks;
}

// Save bookmark using Firestore REST API (no authentication required)
async function saveToFirestoreREST(bookmark, userId) {
  try {
    console.log(`💾 Saving to Firestore REST API: ${bookmark.title}`);
    
    // Generate a unique document ID
    const docId = 'bookmark_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Firestore REST API endpoint
    const url = `https://firestore.googleapis.com/v1/projects/summarist-project-dbc0d/databases/(default)/documents/users/${userId}/bookmarks/${docId}`;
    
    // Prepare data in Firestore format
    const firestoreData = {
      fields: {
        title: { stringValue: bookmark.title },
        url: { stringValue: bookmark.url },
        folder: { stringValue: bookmark.folder || '' },
        dateAdded: { timestampValue: bookmark.dateAdded.toISOString() },
        dateImported: { timestampValue: new Date().toISOString() },
        status: { stringValue: 'pending' },
        summary: { nullValue: null },
        readingTime: { nullValue: null },
        category: { nullValue: null },
        tags: { arrayValue: { values: [] } },
        isRead: { booleanValue: false }
      }
    };
    
    // Make the REST API call
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(firestoreData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firestore API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Saved to Firestore: ${bookmark.title}`);
    
    return { id: docId, ...bookmark };
    
  } catch (error) {
    console.error('❌ Firestore save failed:', error);
    throw error;
  }
}

// Get bookmarks from Firestore using REST API
async function getBookmarksFromFirestore(userId) {
  try {
    console.log('📚 Fetching bookmarks from Firestore for user:', userId);
    
    // Firestore REST API endpoint
    const url = `https://firestore.googleapis.com/v1/projects/summarist-project-dbc0d/databases/(default)/documents/users/${userId}/bookmarks`;
    
    console.log('🌐 Fetching from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Read response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Read API error:', response.status, errorText);
      throw new Error(`Read API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📚 Raw response data:', data);
    
    // Parse documents
    const bookmarks = [];
    if (data.documents && Array.isArray(data.documents)) {
      for (const doc of data.documents) {
        try {
          const bookmark = parseFirestoreDocument(doc);
          bookmarks.push(bookmark);
        } catch (parseError) {
          console.error('❌ Parse error:', parseError);
        }
      }
    }
    
    console.log(`📖 Parsed ${bookmarks.length} bookmarks successfully`);
    return bookmarks;
    
  } catch (error) {
    console.error('❌ Get bookmarks error:', error);
    throw error;
  }
}

// Parse Firestore document format
function parseFirestoreDocument(doc) {
  const fields = doc.fields || {};
  
  return {
    id: doc.name.split('/').pop(),
    title: fields.title?.stringValue || 'Untitled',
    url: fields.url?.stringValue || '',
    folder: fields.folder?.stringValue || '',
    status: fields.status?.stringValue || 'pending',
    dateAdded: fields.dateAdded?.timestampValue ? new Date(fields.dateAdded.timestampValue) : new Date(),
    dateImported: fields.dateImported?.timestampValue ? new Date(fields.dateImported.timestampValue) : new Date(),
    isRead: fields.isRead?.booleanValue || false,
    summary: fields.summary?.arrayValue?.values?.map(v => v.stringValue) || null,
    readingTime: fields.readingTime?.integerValue || null,
    category: fields.category?.stringValue || null
  };
}

console.log('✅ Background loaded with selective import support');