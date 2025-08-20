// background.js - Updated for Firebase ID Token Authentication
console.log('🔧 Background starting...');

async function debugFirebaseToken(firebaseIdToken, operation = 'unknown') {
    console.log(`🔍 DEBUG ${operation}: Firebase ID token details:`);
    console.log('  - Raw value:', firebaseIdToken ? '[HIDDEN]' : 'null');
    console.log('  - Type:', typeof firebaseIdToken);
    console.log('  - Is null:', firebaseIdToken === null);
    console.log('  - Is undefined:', firebaseIdToken === undefined);
    
    if (!firebaseIdToken) {
        console.log('❌ DEBUG: No Firebase ID token available!');
        return;
    }
    
    // ✅ Check if it's a string before using substring
    if (typeof firebaseIdToken === 'string') {
        console.log('  - Length:', firebaseIdToken.length);
        console.log('  - Starts with:', firebaseIdToken.substring(0, 30) + '...');
    } else {
        console.log('  - Token is not a string! Value:', JSON.stringify(firebaseIdToken));
        return;
    }
    
    // Test: Try direct Firestore call with Firebase ID token
    try {
        console.log('🧪 Testing Firebase ID token with Firestore...');
        const firestoreTest = await fetch('https://firestore.googleapis.com/v1/projects/summarist-project-dbc0d/databases/(default)/documents', {
            headers: {
                'Authorization': `Bearer ${firebaseIdToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📊 Firestore test status:', firestoreTest.status);
        
        if (!firestoreTest.ok) {
            const errorText = await firestoreTest.text();
            console.log('❌ Firestore test error:', errorText);
        } else {
            console.log('✅ Firestore test SUCCESS with Firebase ID token!');
        }
    } catch (error) {
        console.log('❌ Firestore test ERROR:', error);
    }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('📚 Extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received:', request.action);
  
  if (request.action === 'test') {
    sendResponse({success: true, message: 'Background working!'});
    return;
  }
  
  // Get bookmark count (for compatibility)
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
  
  // Get bookmark tree structure for folder selection
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
  
  // Analyze bookmark structure for selective import
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
  
  // Import all bookmarks (for backward compatibility)
  if (request.action === 'importBookmarks') {
    console.log('📚 Starting bookmark import for user:', request.userId);
    if (!request.firebaseIdToken) {
      sendResponse({success: false, error: 'Firebase ID token required'});
      return true;
    }
    handleBookmarkImport(request.userId, request.firebaseIdToken)
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
  
  // Import selected bookmarks
  if (request.action === 'importSelectedBookmarks') {
    console.log('📚 Starting selective import for user:', request.userId);
    console.log('📁 Selected folders:', request.selectedFolders);
    
    if (!request.firebaseIdToken) {
      sendResponse({success: false, error: 'Firebase ID token required'});
      return true;
    }
    
    handleSelectiveBookmarkImportSecure(request.userId, request.selectedFolders, request.firebaseIdToken)
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
  
  // Get saved bookmarks from Firestore
  if (request.action === 'getBookmarks') {
    console.log('📖 Getting saved bookmarks for user:', request.userId);
    
    if (!request.firebaseIdToken) {
      sendResponse({success: false, error: 'Firebase ID token required'});
      return true;
    }
    
    getBookmarksFromFirestore(request.userId, request.firebaseIdToken)
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
  
  // Delete bookmark
  if (request.action === 'deleteBookmark') {
    console.log('🗑️ Deleting bookmark:', request.bookmarkId);
    
    if (!request.firebaseIdToken) {
      sendResponse({success: false, error: 'Firebase ID token required'});
      return true;
    }
    
    deleteBookmarkFromFirestore(request.bookmarkId, request.userId, request.firebaseIdToken)
      .then(result => {
        console.log('✅ Delete completed:', result);
        sendResponse({success: true, result});
      })
      .catch(error => {
        console.error('❌ Delete failed:', error);
        sendResponse({success: false, error: error.message});
      });
    return true;
  }
  
  // Restore bookmark
  if (request.action === 'restoreBookmark') {
    console.log('↩️ Restoring bookmark:', request.bookmarkId);

    if (!request.firebaseIdToken) {
      sendResponse({success: false, error: 'Firebase ID token required'});
      return true;
    }

    restoreBookmarkInFirestore(request.bookmarkId, request.userId, request.firebaseIdToken)
      .then(result => sendResponse({success: true, result}))
      .catch(error => sendResponse({success: false, error: error.message}));
    return true;
  }
  
  // Update bookmark read status
  if (request.action === 'updateReadStatus') {
    console.log('📖 Updating read status:', request.bookmarkId, request.isRead);

    if (!request.firebaseIdToken) {
      sendResponse({success: false, error: 'Firebase ID token required'});
      return true;
    }

    updateBookmarkReadStatus(request.bookmarkId, request.userId, request.isRead, request.firebaseIdToken)
      .then(result => sendResponse({success: true, result}))
      .catch(error => sendResponse({success: false, error: error.message}));
    return true;
  }
  
  // Handle Firestore save requests from popup
  if (request.action === 'saveToFirestore') {
    console.log('💾 Handling Firestore save request...');
    
    if (!request.firebaseIdToken) {
      sendResponse({success: false, error: 'Firebase ID token required'});
      return true;
    }
    
    saveToFirestoreREST(request.bookmark, request.userId, request.firebaseIdToken)
      .then(result => sendResponse({success: true, result}))
      .catch(error => sendResponse({success: false, error: error.message}));
    return true;
  }
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

// Analyze bookmark structure for selective import
function analyzeBookmarkStructure(bookmarkTree) {
  const folders = [];
  let totalBookmarks = 0;
  
  function analyzeFolders(nodes, path = '') {
    for (const node of nodes) {
      if (node.children) {
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
        
        analyzeFolders(node.children, folderPath);
      }
    }
  }
  
  analyzeFolders(bookmarkTree);
  
  return {
    totalBookmarks,
    folderCount: folders.length,
    folders: folders.sort((a, b) => b.count - a.count)
  };
}

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

// Handle importing all bookmarks
async function handleBookmarkImport(userId, firebaseIdToken) {
  try {
    console.log('📚 Getting bookmark tree...');
    const bookmarkTree = await chrome.bookmarks.getTree();
    
    console.log('🔍 Extracting bookmarks...');
    const bookmarks = extractBookmarksFromTree(bookmarkTree);
    
    console.log(`📖 Found ${bookmarks.length} bookmarks to process`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < bookmarks.length; i++) {
      const bookmark = bookmarks[i];
      console.log(`⚡ Processing ${i + 1}/${bookmarks.length}: ${bookmark.title}`);
      
      try {
        const saveResult = await saveToFirestoreREST(bookmark, userId, firebaseIdToken);
        successCount++;
        console.log(`✅ Saved: ${bookmark.title}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to save: ${bookmark.title}`, error);
      }
      
      chrome.runtime.sendMessage({
        action: 'importProgress',
        processed: i + 1,
        total: bookmarks.length,
        percentage: Math.round(((i + 1) / bookmarks.length) * 100)
      });
      
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

// Handle selective bookmark import
async function handleSelectiveBookmarkImportSecure(userId, selectedFolderPaths, firebaseIdToken) {
  try {
    console.log('📚 Getting bookmark tree for import...');
    const bookmarkTree = await chrome.bookmarks.getTree();
    
    const bookmarks = extractBookmarksFromSelectedFolders(bookmarkTree, selectedFolderPaths);
    console.log(`📖 Found ${bookmarks.length} bookmarks in selected folders`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < bookmarks.length; i++) {
      const bookmark = bookmarks[i];
      console.log(`⚡ Processing ${i + 1}/${bookmarks.length}: ${bookmark.title}`);
      
      try {
        const saveResult = await saveToFirestoreREST(bookmark, userId, firebaseIdToken);
        successCount++;
        console.log(`✅ Saved: ${bookmark.title}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to save: ${bookmark.title}`, error);
      }
      
      chrome.runtime.sendMessage({
        action: 'importProgress',
        processed: i + 1,
        total: bookmarks.length,
        percentage: Math.round(((i + 1) / bookmarks.length) * 100)
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ Import complete');
    return {
      total: bookmarks.length,
      processed: bookmarks.length,
      success: successCount,
      errors: errorCount,
      selectedFolders: selectedFolderPaths.length
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

function extractBookmarksFromSelectedFolders(bookmarkTree, selectedFolderPaths) {
  const bookmarks = [];
  
  function extractFromNodes(nodes, currentPath = '') {
    for (const node of nodes) {
      if (node.url) {
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
        const folderPath = currentPath ? `${currentPath}/${node.title}` : node.title;
        extractFromNodes(node.children, folderPath);
      }
    }
  }
  
  extractFromNodes(bookmarkTree);
  return bookmarks;
}

// Save bookmark using Firestore REST API with Firebase ID token
async function saveToFirestoreREST(bookmark, userId, firebaseIdToken) {
  try {
    console.log(`💾 Saving to Firestore with Firebase ID token: ${bookmark.title}`);

    await debugFirebaseToken(firebaseIdToken, 'SAVE_OPERATION');
    
    if (!firebaseIdToken) {
      throw new Error('No Firebase ID token provided');
    }
    
    const docId = 'bookmark_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const url = `https://firestore.googleapis.com/v1/projects/summarist-project-dbc0d/databases/(default)/documents/users/${userId}/bookmarks/${docId}`;
    
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
        isDeleted: { booleanValue: false },
        deletedAt: { nullValue: null },
        isRead: { booleanValue: false }
      }
    };
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firebaseIdToken}`
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

// Get bookmarks from Firestore using Firebase ID token
async function getBookmarksFromFirestore(userId, firebaseIdToken) {
  try {
    console.log('📚 Fetching bookmarks with Firebase ID token for user:', userId);

    await debugFirebaseToken(firebaseIdToken, 'READ_OPERATION');
    
    if (!firebaseIdToken) {
      throw new Error('No Firebase ID token provided');
    }
    
    const url = `https://firestore.googleapis.com/v1/projects/summarist-project-dbc0d/databases/(default)/documents/users/${userId}/bookmarks`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firebaseIdToken}`
      }
    });
    
    console.log('📊 Read response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Read API error:', response.status, errorText);
      throw new Error(`Read API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    const bookmarks = [];
    if (data.documents && Array.isArray(data.documents)) {
      for (const doc of data.documents) {
        try {
          const bookmark = parseFirestoreDocument(doc);
          if (!bookmark.isDeleted) {
            bookmarks.push(bookmark);
          }
        } catch (parseError) {
          console.error('❌ Parse error:', parseError);
        }
      }
    }
    
    console.log(`📖 Parsed ${bookmarks.length} bookmarks`);
    return bookmarks;
    
  } catch (error) {
    console.error('❌ Get bookmarks error:', error);
    throw error;
  }
}

// Delete bookmark function
async function deleteBookmarkFromFirestore(bookmarkId, userId, firebaseIdToken) {
  try {
    console.log('🗑️ Soft deleting bookmark:', bookmarkId);

    await debugFirebaseToken(firebaseIdToken, 'DELETE_OPERATION');
    
    if (!firebaseIdToken) {
      throw new Error('No Firebase ID token provided');
    }
    
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/summarist-project-dbc0d/databases/(default)/documents/users/${userId}/bookmarks/${bookmarkId}?updateMask.fieldPaths=isDeleted&updateMask.fieldPaths=deletedAt`;
    
    const updateData = {
      fields: {
        isDeleted: { booleanValue: true },
        deletedAt: { timestampValue: new Date().toISOString() }
      }
    };
    
    const response = await fetch(firestoreUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firebaseIdToken}`
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Delete API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Bookmark deleted');
    
    return { id: bookmarkId, deleted: true };
    
  } catch (error) {
    console.error('❌ Delete bookmark failed:', error);
    throw error;
  }
}

// Restore bookmark function
async function restoreBookmarkInFirestore(bookmarkId, userId, firebaseIdToken) {
  try {
    console.log(`↩️ Restoring bookmark ${bookmarkId} for user ${userId}`);

    await debugFirebaseToken(firebaseIdToken, 'RESTORE_OPERATION');
    
    if (!firebaseIdToken) {
      throw new Error('No Firebase ID token provided');
    }
    
    const url = `https://firestore.googleapis.com/v1/projects/summarist-project-dbc0d/databases/(default)/documents/users/${userId}/bookmarks/${bookmarkId}?updateMask.fieldPaths=isDeleted&updateMask.fieldPaths=deletedAt`;
    
    const updateData = {
      fields: {
        isDeleted: { booleanValue: false },
        deletedAt: { nullValue: null }
      }
    };
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firebaseIdToken}`
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Restore failed: ${response.status} - ${errorText}`);
    }
    
    console.log(`✅ Successfully restored bookmark ${bookmarkId}`);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Restore bookmark error:', error);
    throw error;
  }
}

// Update bookmark read status
async function updateBookmarkReadStatus(bookmarkId, userId, isRead, firebaseIdToken) {
  try {
    console.log(`📖 Updating read status for bookmark ${bookmarkId} to ${isRead}`);

    await debugFirebaseToken(firebaseIdToken, 'UPDATE_READ_STATUS');
    
    if (!firebaseIdToken) {
      throw new Error('No Firebase ID token provided');
    }
    
    const url = `https://firestore.googleapis.com/v1/projects/summarist-project-dbc0d/databases/(default)/documents/users/${userId}/bookmarks/${bookmarkId}?updateMask.fieldPaths=isRead`;
    
    const updateData = {
      fields: {
        isRead: { booleanValue: isRead }
      }
    };
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firebaseIdToken}`
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Update read status failed: ${response.status} - ${errorText}`);
    }
    
    console.log(`✅ Successfully updated read status for bookmark ${bookmarkId}`);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Update read status error:', error);
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
    isDeleted: fields.isDeleted?.booleanValue || false,
    summary: fields.summary?.arrayValue?.values?.map(v => v.stringValue) || null,
    readingTime: fields.readingTime?.integerValue || null,
    category: fields.category?.stringValue || null,
    tags: fields.tags?.arrayValue?.values?.map(v => v.stringValue) || []
  };
}

console.log('✅ Background loaded with Firebase ID token support');