import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// --- Interfaces for Request Data ---
// Define what data the client sends for an update
interface UpdateRequestData {
    collectionName: string;
    id: string;
    updates: any;
}

// Define what data the client sends for a timeline log
interface TimelineRequestData {
    petitionId: string;
    updateObject: any;
}

// --- 1. SECURE ADMIN UPDATE ENDPOINT ---
export const updateAdminDocument = functions.https.onCall(async (data, context) => {
    
    // 1. Authentication Check: Use context.auth securely
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Only authenticated administrators can update documents.');
    }

    // 2. Type Casting: Cast data to the expected interface
    const { collectionName, id, updates } = data as UpdateRequestData;

    if (!collectionName || !id || !updates) {
        throw new functions.https.HttpsError('invalid-argument', 'The request is missing required fields (collectionName, id, updates).');
    }

    try {
        const docRef = db.collection(collectionName).doc(id);
        
        // Use the Admin SDK to perform the update, guaranteeing success.
        await docRef.update(updates); 
        
        return { success: true, message: `Document ${id} updated in ${collectionName}.` };

    } catch (error) {
        functions.logger.error(`Error updating document ${id} in ${collectionName}:`, error);
        throw new functions.https.HttpsError('internal', 'Server failed to execute the update operation.');
    }
});

// --- 2. TIMELINE LOG ENDPOINT ---
export const addTimelineLog = functions.https.onCall(async (data, context) => {
    
    // Authentication Check: Use context.auth securely
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Only authenticated administrators can add timeline entries.');
    }
    
    // Type Casting: Cast data to the expected interface
    const { petitionId, updateObject } = data as TimelineRequestData;
    
    if (!petitionId || !updateObject) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing petitionId or updateObject.');
    }
    
    const petitionRef = db.collection('petitions').doc(petitionId);
    
    try {
        // Use Admin SDK to safely append to the 'updates' array.
        await petitionRef.update({
            updates: admin.firestore.FieldValue.arrayUnion(updateObject)
        });

        return { success: true, message: 'Timeline updated successfully.' };
    } catch (error) {
        functions.logger.error(`Error adding timeline update to ${petitionId}:`, error);
        throw new functions.https.HttpsError('internal', 'Server failed to add timeline update.');
    }
});