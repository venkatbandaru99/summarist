// background.js - Hybrid Approach (No ES6 Modules)
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

function countBookmarks(nodes) {
  let count = 0;
  for (const node of nodes) {
    if (node.url) count++;
    if (node.children) count += countBookmarks(node.children);
  }
  return count;
}

async function handleBookmarkImport(userId) {
  try {
    console.log('📚 Getting bookmark tree...');
    const bookmarkTree = await chrome.bookmarks.getTree();
    
    console.log('🔍 Extracting bookmarks...');
    const bookmarks = extractBookmarksFromTree(bookmarkTree);
    
    console.log(`📖 Found ${bookmarks.length} bookmarks to process`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each bookmark and send to popup for Firestore saving
    for (let i = 0; i < bookmarks.length; i++) {
      const bookmark = bookmarks[i];
      console.log(`⚡ Processing ${i + 1}/${bookmarks.length}: ${bookmark.title}`);
      
      try {
        // Save directly to Firestore REST API
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

// Save bookmark using Firestore REST API with Authentication
async function saveToFirestoreREST(bookmark, userId) {
  try {
    console.log(`💾 Saving to Firestore REST API: ${bookmark.title}`);
    
    // Get the user's auth token from Chrome Identity
    let authToken;
    try {
      authToken = await chrome.identity.getAuthToken({ interactive: false });
      console.log('🔑 Got auth token for Firestore API');
    } catch (tokenError) {
      console.error('❌ Failed to get auth token:', tokenError);
      throw new Error('Authentication required for Firestore access');
    }
    
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
    
    // Make the authenticated REST API call
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(firestoreData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Firestore API response:', response.status, errorText);
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

console.log('✅ Background loaded (hybrid approach with Firestore REST)');

console.log('✅ Background loaded (hybrid approach with Firestore REST)');

// Save bookmark using Firestore REST API
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