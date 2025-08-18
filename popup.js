// popup.js - Enhanced with Direct Firestore Operations
import { 
    initializeApp,
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence
} from './lib/firebase-bundle.js';
import { firebaseConfig } from './firebase-config.js';

console.log('=== POPUP.JS WITH FIREBASE BUNDLE ===');

// Initialize Firebase
let app, auth;

try {
    console.log('🔧 Initializing Firebase with bundle...');
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    console.log('✅ Firebase bundle initialized successfully');
} catch (error) {
    console.error('❌ Firebase bundle initialization failed:', error);
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOM READY ===');
    
    if (auth) {
        document.getElementById('status').textContent = '✅ Firebase bundle ready!';
    } else {
        document.getElementById('status').textContent = '❌ Firebase bundle failed';
    }
    
    // Test button
    document.getElementById('testBtn').addEventListener('click', async function() {
        console.log('🧪 Testing background communication...');
        
        try {
            const response = await chrome.runtime.sendMessage({action: 'test'});
            console.log('📨 Test response:', response);
            alert('Background communication: ' + response.message);
        } catch (error) {
            console.error('❌ Communication failed:', error);
            alert('Communication failed: ' + error.message);
        }
    });
    
    // Login button
    document.getElementById('loginBtn').addEventListener('click', async function() {
        console.log('🔥 LOGIN BUTTON CLICKED!');
        
        if (!auth) {
            alert('Firebase bundle not loaded.');
            return;
        }
        
        try {
            document.getElementById('status').textContent = '🔄 Attempting Chrome Identity login...';
            
            const provider = new GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');
            
            console.log('📋 Using Chrome Identity API...');
            
            const result = await signInWithPopup(auth, provider);
            
            console.log('✅ Login success!');
            console.log('👤 User:', result.user.email);
            
            document.getElementById('status').textContent = '✅ Login successful!';
            
        } catch (error) {
            console.error('❌ Login failed:', error);
            document.getElementById('status').textContent = '❌ Login failed';
            alert('Login failed: ' + error.message);
        }
    });
    
    // Import Bookmarks button
    document.getElementById('importBtn').addEventListener('click', async function() {
        console.log('📚 IMPORT BOOKMARKS CLICKED!');
        await importBookmarks();
    });
    
    // Auth state listener
    if (auth) {
        onAuthStateChanged(auth, (user) => {
            console.log('🔄 Auth state:', user ? user.email : 'No user');
            
            if (user) {
                document.getElementById('auth-container').classList.add('hidden');
                document.getElementById('app-container').classList.remove('hidden');
                document.getElementById('userEmail').textContent = user.email;
                
                // Load bookmark count and existing bookmarks
                loadBookmarkData();
            } else {
                document.getElementById('auth-container').classList.remove('hidden');
                document.getElementById('app-container').classList.add('hidden');
            }
        });
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', function() {
            console.log('🚪 Logout clicked');
            signOut(auth);
        });
    }
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('📨 Popup received message:', request);
        
        if (request.action === 'saveBookmark') {
            console.log('💾 Handling Firestore save request...');
            saveBookmarkToFirestore(request.bookmark, request.userId)
                .then(result => sendResponse({success: true, result}))
                .catch(error => sendResponse({success: false, error: error.message}));
            return true;
        }
        
        if (request.action === 'importProgress') {
            updateImportProgress(request.processed, request.total, request.percentage);
        }
    });
});

// Bookmark Import Functions

async function loadBookmarkData() {
    try {
        console.log('📊 Loading bookmark data...');
        
        // Set loading state
        const bookmarkCountElement = document.getElementById('bookmarkCount');
        bookmarkCountElement.textContent = 'Counting bookmarks...';
        
        // Get bookmark count from Chrome
        const countResponse = await chrome.runtime.sendMessage({action: 'getBookmarkCount'});
        
        console.log('📊 Bookmark count response:', countResponse);
        
        if (countResponse && countResponse.success) {
            const count = countResponse.count;
            if (count === 0) {
                bookmarkCountElement.textContent = 'No bookmarks found to import';
                bookmarkCountElement.style.color = '#666';
                // Disable import button if no bookmarks
                document.getElementById('importBtn').disabled = true;
                document.getElementById('importBtn').textContent = 'No Bookmarks to Import';
            } else {
                bookmarkCountElement.textContent = `${count} bookmarks available to import`;
                bookmarkCountElement.style.color = '#333';
                // Enable import button
                document.getElementById('importBtn').disabled = false;
                document.getElementById('importBtn').textContent = 'Import Bookmarks';
            }
        } else {
            // Handle error case
            bookmarkCountElement.textContent = 'Error counting bookmarks';
            bookmarkCountElement.style.color = '#d32f2f';
            console.error('❌ Failed to get bookmark count:', countResponse?.error);
        }
        
    } catch (error) {
        console.error('❌ Error loading bookmark data:', error);
        document.getElementById('bookmarkCount').textContent = 'Error loading bookmark data';
        document.getElementById('bookmarkCount').style.color = '#d32f2f';
    }
}

async function importBookmarks() {
    try {
        if (!auth.currentUser) {
            alert('Please login first');
            return;
        }
        
        console.log('📚 Starting bookmark import...');
        
        // Check if import button is disabled (no bookmarks)
        const importBtn = document.getElementById('importBtn');
        if (importBtn.disabled) {
            alert('No bookmarks available to import. Please add some bookmarks to your browser first.');
            return;
        }
        
        // Show import UI
        showImportProgress();
        
        // Get bookmark count first
        const countResponse = await chrome.runtime.sendMessage({action: 'getBookmarkCount'});
        
        if (!countResponse || !countResponse.success) {
            throw new Error(countResponse?.error || 'Failed to get bookmark count');
        }
        
        const bookmarkCount = countResponse.count;
        console.log(`📊 Found ${bookmarkCount} bookmarks to import`);
        
        // Handle zero bookmarks case
        if (bookmarkCount === 0) {
            hideImportProgress();
            alert('No bookmarks found to import. Please add some bookmarks to your browser first.');
            return;
        }
        
        // Confirm with user
        const confirmed = confirm(`Import ${bookmarkCount} bookmarks? This will save them to your database.`);
        if (!confirmed) {
            hideImportProgress();
            return;
        }
        
        // Start import
        const importResponse = await chrome.runtime.sendMessage({
            action: 'importBookmarks',
            userId: auth.currentUser.uid
        });
        
        if (importResponse && importResponse.success) {
            console.log('✅ Import completed:', importResponse.result);
            showImportComplete(importResponse.result);
        } else {
            throw new Error(importResponse?.error || 'Import failed');
        }
        
    } catch (error) {
        console.error('❌ Import failed:', error);
        alert(`Import failed: ${error.message}`);
        hideImportProgress();
    }
}

// Save individual bookmark to Firestore - SIMPLIFIED APPROACH
async function saveBookmarkToFirestore(bookmark, userId) {
    try {
        console.log('💾 Saving bookmark to Firestore:', bookmark.title);
        
        // Use fetch API to save to Firestore REST API
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${userId}/bookmarks`;
        
        // Get current user's auth token
        if (!auth.currentUser) {
            throw new Error('User not authenticated');
        }
        
        // For now, let's use a simpler approach with the existing background script
        // We'll send the data to background script which can handle the REST API call
        const saveResult = await chrome.runtime.sendMessage({
            action: 'saveToFirestore',
            bookmark: {
                title: bookmark.title,
                url: bookmark.url,
                folder: bookmark.folder || '',
                dateAdded: bookmark.dateAdded || new Date(),
                dateImported: new Date(),
                status: 'pending',
                summary: null,
                readingTime: null,
                category: null,
                tags: [],
                isRead: false
            },
            userId: userId
        });
        
        if (saveResult && saveResult.success) {
            console.log(`✅ Successfully saved: ${bookmark.title}`);
            return saveResult.result;
        } else {
            throw new Error(saveResult?.error || 'Save failed');
        }
        
    } catch (error) {
        console.error('❌ Error saving bookmark:', error);
        throw new Error(`Failed to save "${bookmark.title}": ${error.message}`);
    }
}

// UI functions for import progress
function showImportProgress() {
    document.getElementById('importSection').style.display = 'block';
    document.getElementById('importBtn').disabled = true;
    document.getElementById('importProgressText').textContent = 'Preparing import...';
    document.getElementById('importProgress').style.width = '0%';
}

function hideImportProgress() {
    document.getElementById('importSection').style.display = 'none';
    document.getElementById('importBtn').disabled = false;
}

function updateImportProgress(processed, total, percentage) {
    const progressBar = document.getElementById('importProgress');
    const progressText = document.getElementById('importProgressText');
    
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
    
    if (progressText) {
        progressText.textContent = `Importing bookmarks... ${processed}/${total} (${percentage}%)`;
    }
}

function showImportComplete(results) {
    hideImportProgress();
    alert(`Import complete!\n\nTotal: ${results.total}\nSuccess: ${results.success}\nErrors: ${results.errors}`);
    
    // Refresh bookmark count
    loadBookmarkData();
}

console.log('=== POPUP.JS LOADED WITH BOOKMARK IMPORT ===');